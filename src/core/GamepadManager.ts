/**
 * Gamepad input manager for freeflight camera control.
 *
 * Reads a specific gamepad (selected by user) and returns structured actions.
 * No polling occurs unless a gamepad index is set. Pure TypeScript, no Vue deps.
 *
 * Standard Gamepad mapping:
 *   Left stick X/Y  → move left/right, up/down (analog)
 *   Right stick X/Y  → look yaw/pitch (analog)
 *   LT (axis 4)      → move backward (analog)
 *   RT (axis 5)      → move forward (analog)
 *   LB (button 4)    → speed boost (like Shift)
 *   RB (button 5)    → hold: center selection mode
 *   L3 (button 10)   → reset position
 *   D-pad L/R (14/15)→ change cluster (with key-repeat)
 *   D-pad U/D (12/13)→ adjust selection range threshold
 *   A (0)            → decrease look speed
 *   B (1)            → increase look speed
 *   X/Square (2)     → increase smoothing
 *   Y/Triangle (3)   → decrease smoothing
 */

export interface GamepadInfo {
  index: number
  id: string
  mapping: string
}

export interface GamepadActions {
  /** Analog movement in camera-local space: x=right, y=up, z=forward. Range [-1,1]. */
  moveX: number
  moveY: number
  moveZ: number
  /** Analog look in radians/sec */
  lookYaw: number
  lookPitch: number
  /** Speed boost held */
  fast: boolean
  /** Center selection mode held (RB) */
  centerSelect: boolean
  /** Edge-detected: reset pressed this frame */
  resetPressed: boolean
  /** Edge-detected: cluster change (-1, 0, +1) */
  clusterChange: number
  /** Edge-detected: threshold change (-1, 0, +1) */
  thresholdChange: number
  /** Edge-detected: smoothing change (-1, 0, +1) */
  smoothingChange: number
}

const DEADZONE = 0.15
const LOOK_SPEED_MIN = 0.1
const LOOK_SPEED_MAX = 2.5
const LOOK_SPEED_DEFAULT = 1.25
const LOOK_SPEED_STEP = 0.1

// D-pad repeat timing
const REPEAT_INITIAL_MS = 400
const REPEAT_RATE_MS = 150

/** Apply deadzone with remapped range so there's no jump at the edge */
function applyDeadzone(value: number): number {
  const abs = Math.abs(value)
  if (abs < DEADZONE) return 0
  const sign = value > 0 ? 1 : -1
  return sign * (abs - DEADZONE) / (1 - DEADZONE)
}

interface RepeatState {
  held: boolean
  firstTime: number
  lastRepeat: number
}

export class GamepadManager {
  private gamepadIndex: number
  public invertY: boolean = false

  // Previous button states for edge detection
  private prevReset: boolean = false
  private prevA: boolean = false
  private prevB: boolean = false
  private prevX: boolean = false
  private prevY: boolean = false

  // Trigger axes on Linux start at 0 but rest at -1 once used.
  // Until an axis moves away from 0, treat it as released to avoid phantom input.
  private ltAxisActivated: boolean = false
  private rtAxisActivated: boolean = false
  public lookSpeed: number = LOOK_SPEED_DEFAULT

  // D-pad repeat state
  private dpadLeft: RepeatState = { held: false, firstTime: 0, lastRepeat: 0 }
  private dpadRight: RepeatState = { held: false, firstTime: 0, lastRepeat: 0 }
  private dpadUp: RepeatState = { held: false, firstTime: 0, lastRepeat: 0 }
  private dpadDown: RepeatState = { held: false, firstTime: 0, lastRepeat: 0 }

  constructor(index: number) {
    this.gamepadIndex = index
  }

  /**
   * List currently connected gamepads.
   * Call this when the selection modal opens to populate the list.
   */
  static listGamepads(): GamepadInfo[] {
    const gamepads = navigator.getGamepads()
    const result: GamepadInfo[] = []
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i]
      if (gp) {
        result.push({ index: gp.index, id: gp.id, mapping: gp.mapping })
      }
    }
    return result
  }

  /**
   * Poll the selected gamepad and return structured actions.
   * Returns null if the gamepad is disconnected.
   *
   * @param timestamp - current timestamp (ms) from requestAnimationFrame
   */
  poll(timestamp: number): GamepadActions | null {
    const gamepads = navigator.getGamepads()
    const gp = gamepads[this.gamepadIndex]
    if (!gp) return null

    // Axes (standard layout)
    const leftX = applyDeadzone(gp.axes[0] ?? 0)
    const leftY = applyDeadzone(gp.axes[1] ?? 0)
    const rightX = applyDeadzone(gp.axes[2] ?? 0)
    const rightY = applyDeadzone(gp.axes[3] ?? 0)

    // Triggers: prefer axes 4/5 (Linux/some drivers report triggers as axes -1..1),
    // fall back to buttons 6/7 for controllers that use standard button mapping.
    // Linux quirk: trigger axes start at 0 but rest at -1 once physically used.
    // Until an axis moves away from 0, treat it as released to avoid phantom 0.5 input.
    const ltAxisRaw = gp.axes[4]
    const rtAxisRaw = gp.axes[5]
    if (ltAxisRaw !== undefined && ltAxisRaw !== 0) this.ltAxisActivated = true
    if (rtAxisRaw !== undefined && rtAxisRaw !== 0) this.rtAxisActivated = true
    const ltBtn = gp.buttons[6]
    const rtBtn = gp.buttons[7]
    const ltFromAxis = (ltAxisRaw !== undefined && this.ltAxisActivated) ? (ltAxisRaw + 1) / 2 : undefined
    const rtFromAxis = (rtAxisRaw !== undefined && this.rtAxisActivated) ? (rtAxisRaw + 1) / 2 : undefined
    const lt = ltFromAxis ?? (ltBtn ? (ltBtn.value > 0 ? ltBtn.value : (ltBtn.pressed ? 1 : 0)) : 0)
    const rt = rtFromAxis ?? (rtBtn ? (rtBtn.value > 0 ? rtBtn.value : (rtBtn.pressed ? 1 : 0)) : 0)

    // Movement: left stick for strafe + up/down, triggers for forward/back
    const moveX = leftX
    const moveY = -leftY // stick forward (negative Y) = move up
    const moveZ = rt - lt // RT = forward, LT = backward

    // Look: right stick (speed adjustable via A/B)
    const lookYaw = -rightX * this.lookSpeed
    const lookPitch = (this.invertY ? -rightY : rightY) * this.lookSpeed

    // Buttons
    const fast = gp.buttons[4]?.pressed ?? false
    const centerSelect = gp.buttons[5]?.pressed ?? false

    // Edge detection: look speed (A=0 decrease, B=1 increase)
    const aNow = gp.buttons[0]?.pressed ?? false
    const bNow = gp.buttons[1]?.pressed ?? false
    if (aNow && !this.prevA) this.lookSpeed = Math.max(LOOK_SPEED_MIN, this.lookSpeed - LOOK_SPEED_STEP)
    if (bNow && !this.prevB) this.lookSpeed = Math.min(LOOK_SPEED_MAX, this.lookSpeed + LOOK_SPEED_STEP)
    this.prevA = aNow
    this.prevB = bNow

    // Edge detection: reset (L3, button 10)
    const resetNow = gp.buttons[10]?.pressed ?? false
    const resetPressed = resetNow && !this.prevReset
    this.prevReset = resetNow

    // Edge detection: smoothing (X=2 decrease, Y=3 increase)
    const xNow = gp.buttons[2]?.pressed ?? false
    const yNow = gp.buttons[3]?.pressed ?? false
    let smoothingChange = 0
    if (xNow && !this.prevX) smoothingChange += 1
    if (yNow && !this.prevY) smoothingChange -= 1
    this.prevX = xNow
    this.prevY = yNow

    // D-pad with key-repeat
    const clusterChange = this.processDpadRepeat(
      gp.buttons[14]?.pressed ?? false,
      gp.buttons[15]?.pressed ?? false,
      this.dpadLeft, this.dpadRight,
      timestamp
    )

    const thresholdChange = this.processDpadRepeat(
      gp.buttons[13]?.pressed ?? false, // down = decrease
      gp.buttons[12]?.pressed ?? false, // up = increase
      this.dpadDown, this.dpadUp,
      timestamp
    )

    return {
      moveX, moveY, moveZ,
      lookYaw, lookPitch,
      fast, centerSelect,
      resetPressed,
      clusterChange, thresholdChange, smoothingChange
    }
  }

  /**
   * Process D-pad pair with initial delay + repeat rate.
   * Returns -1, 0, or +1 for this frame.
   */
  private processDpadRepeat(
    negPressed: boolean, posPressed: boolean,
    negState: RepeatState, posState: RepeatState,
    timestamp: number
  ): number {
    let result = 0
    result -= this.processOneRepeat(negPressed, negState, timestamp) ? 1 : 0
    result += this.processOneRepeat(posPressed, posState, timestamp) ? 1 : 0
    return result
  }

  private processOneRepeat(pressed: boolean, state: RepeatState, timestamp: number): boolean {
    if (!pressed) {
      state.held = false
      return false
    }
    if (!state.held) {
      // Just pressed
      state.held = true
      state.firstTime = timestamp
      state.lastRepeat = timestamp
      return true
    }
    // Held — check repeat timing
    const elapsed = timestamp - state.firstTime
    if (elapsed < REPEAT_INITIAL_MS) return false
    if (timestamp - state.lastRepeat >= REPEAT_RATE_MS) {
      state.lastRepeat = timestamp
      return true
    }
    return false
  }
}
