"""
555 Bridge — Computer Control Helper
Called by server.js to execute desktop actions via Windows API (ctypes).
No external dependencies beyond Python stdlib + PIL (for screenshots).
"""
import sys
import json
import base64
import ctypes
import io
import os
import time
from ctypes import wintypes

# ── Windows API bindings ──────────────────────────────────────────
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
gdi32 = ctypes.windll.gdi32

# SetCursorPos
user32.SetCursorPos.argtypes = [ctypes.c_int, ctypes.c_int]
user32.SetCursorPos.restype = ctypes.c_bool

# mouse_event
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_ABSOLUTE = 0x8000

user32.mouse_event.argtypes = [ctypes.c_uint, ctypes.c_uint, ctypes.c_uint, ctypes.c_uint, ctypes.c_ulong]
user32.mouse_event.restype = None

# keybd_event
KEYEVENTF_KEYDOWN = 0x0000
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_EXTENDEDKEY = 0x0001

user32.keybd_event.argtypes = [ctypes.c_ubyte, ctypes.c_ubyte, ctypes.c_uint, ctypes.c_ulong]
user32.keybd_event.restype = None

# GetForegroundWindow / GetWindowThreadProcessId
user32.GetForegroundWindow.restype = wintypes.HWND
user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetWindowThreadProcessId.restype = wintypes.DWORD

# VK codes
VK_CODES = {
    'backspace': 0x08, 'tab': 0x09, 'enter': 0x0D, 'return': 0x0D,
    'shift': 0x10, 'ctrl': 0x11, 'control': 0x11, 'alt': 0x12,
    'pause': 0x13, 'capslock': 0x14, 'escape': 0x1B, 'esc': 0x1B,
    'space': 0x20, 'pageup': 0x21, 'pagedown': 0x22, 'end': 0x23, 'home': 0x24,
    'left': 0x25, 'up': 0x26, 'right': 0x27, 'down': 0x28,
    'printscreen': 0x2C, 'insert': 0x2D, 'delete': 0x2E,
    '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
    '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
    'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45,
    'f': 0x46, 'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A,
    'k': 0x4B, 'l': 0x4C, 'm': 0x4D, 'n': 0x4E, 'o': 0x4F,
    'p': 0x50, 'q': 0x51, 'r': 0x52, 's': 0x53, 't': 0x54,
    'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58, 'y': 0x59, 'z': 0x5A,
    'win': 0x5B, 'windows': 0x5B, 'lwin': 0x5B, 'rwin': 0x5C,
    'f1': 0x70, 'f2': 0x71, 'f3': 0x72, 'f4': 0x73, 'f5': 0x74,
    'f6': 0x75, 'f7': 0x76, 'f8': 0x77, 'f9': 0x78, 'f10': 0x79,
    'f11': 0x7A, 'f12': 0x7B,
    'numlock': 0x90, 'scrolllock': 0x91,
    'volume_mute': 0xAD, 'volume_down': 0xAE, 'volume_up': 0xAF,
    'next_track': 0xB0, 'prev_track': 0xB1, 'stop_media': 0xB2,
    'play_pause': 0xB3,
}

# ── Screenshot ────────────────────────────────────────────────────
def take_screenshot(format='base64'):
    """Capture the primary monitor and return base64 PNG or raw bytes."""
    try:
        from PIL import ImageGrab
    except ImportError:
        return {'error': 'PIL/Pillow not installed. Run: pip install Pillow'}

    try:
        img = ImageGrab.grab(all_screens=False)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        data = buf.getvalue()
        if format == 'base64':
            return {
                'success': True,
                'image': base64.b64encode(data).decode('utf-8'),
                'width': img.width,
                'height': img.height,
                'format': 'png',
            }
        else:
            return data
    except Exception as e:
        return {'error': f'Screenshot failed: {str(e)}'}


# ── Click ─────────────────────────────────────────────────────────
def click(x, y, button='left', count=1):
    """Move cursor to (x,y) and click."""
    try:
        curr_x = ctypes.c_int()
        curr_y = ctypes.c_int()
        # Save current position
        point = ctypes.c_ulong()
        user32.GetCursorPos(ctypes.byref(curr_x), ctypes.byref(curr_y))  # not real API, use GetCursorPos properly

        # Actually GetCursorPos takes a POINT pointer
        class POINT(ctypes.Structure):
            _fields_ = [('x', ctypes.c_long), ('y', ctypes.c_long)]
        
        old_pos = POINT()
        user32.GetCursorPos(ctypes.byref(old_pos))

        # Move to target
        user32.SetCursorPos(x, y)
        time.sleep(0.02)

        down_map = {'left': MOUSEEVENTF_LEFTDOWN, 'right': MOUSEEVENTF_RIGHTDOWN, 'middle': MOUSEEVENTF_MIDDLEDOWN}
        up_map = {'left': MOUSEEVENTF_LEFTUP, 'right': MOUSEEVENTF_RIGHTUP, 'middle': MOUSEEVENTF_MIDDLEUP}

        for _ in range(count):
            user32.mouse_event(down_map[button], 0, 0, 0, 0)
            time.sleep(0.02)
            user32.mouse_event(up_map[button], 0, 0, 0, 0)
            time.sleep(0.02)

        # Restore position
        user32.SetCursorPos(old_pos.x, old_pos.y)
        return {'success': True, 'action': 'click', 'x': x, 'y': y, 'button': button}
    except Exception as e:
        return {'error': f'Click failed: {str(e)}'}


# ── Type Text ─────────────────────────────────────────────────────
def type_text(text):
    """Type text by sending WM_CHAR-style key events via VK codes and shift states."""
    try:
        # For simplicity, use keybd_event with shift for uppercase/symbols
        for ch in text:
            vk = 0
            shift = False

            if 'a' <= ch <= 'z':
                vk = VK_CODES[ch]
            elif 'A' <= ch <= 'Z':
                vk = VK_CODES[ch.lower()]
                shift = True
            elif '0' <= ch <= '9':
                vk = VK_CODES[ch]
            elif ch == ' ':
                vk = VK_CODES['space']
            elif ch == '\n' or ch == '\r':
                vk = VK_CODES['enter']
            elif ch == '\t':
                vk = VK_CODES['tab']
            elif ch == '.':
                vk = 0xBE
            elif ch == ',':
                vk = 0xBC
            elif ch == '/':
                vk = 0xBF
            elif ch == '\\':
                vk = 0xDC
            elif ch == ';':
                vk = 0xBA
            elif ch == "'":
                vk = 0xDE
            elif ch == '[':
                vk = 0xDB
            elif ch == ']':
                vk = 0xDD
            elif ch == '-':
                vk = 0xBD
            elif ch == '=':
                vk = 0xBB
            elif ch == '`':
                vk = 0xC0
            elif ch == '!':
                vk = 0x31; shift = True
            elif ch == '@':
                vk = 0x32; shift = True
            elif ch == '#':
                vk = 0x33; shift = True
            elif ch == '$':
                vk = 0x34; shift = True
            elif ch == '%':
                vk = 0x35; shift = True
            elif ch == '^':
                vk = 0x36; shift = True
            elif ch == '&':
                vk = 0x37; shift = True
            elif ch == '*':
                vk = 0x38; shift = True
            elif ch == '(':
                vk = 0x39; shift = True
            elif ch == ')':
                vk = 0x30; shift = True
            elif ch == ':':
                vk = 0xBA; shift = True
            elif ch == '"':
                vk = 0xDE; shift = True
            elif ch == '<':
                vk = 0xBC; shift = True
            elif ch == '>':
                vk = 0xBE; shift = True
            elif ch == '?':
                vk = 0xBF; shift = True
            elif ch == '{':
                vk = 0xDB; shift = True
            elif ch == '}':
                vk = 0xDD; shift = True
            elif ch == '_':
                vk = 0xBD; shift = True
            elif ch == '+':
                vk = 0xBB; shift = True
            elif ch == '~':
                vk = 0xC0; shift = True
            elif ch == '|':
                vk = 0xDC; shift = True
            else:
                continue  # Skip unsupported chars

            if vk:
                if shift:
                    user32.keybd_event(VK_CODES['shift'], 0, KEYEVENTF_KEYDOWN, 0)
                    time.sleep(0.01)
                user32.keybd_event(vk, 0, KEYEVENTF_KEYDOWN, 0)
                time.sleep(0.01)
                user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
                if shift:
                    user32.keybd_event(VK_CODES['shift'], 0, KEYEVENTF_KEYUP, 0)
                time.sleep(0.02)

        return {'success': True, 'action': 'type', 'length': len(text)}
    except Exception as e:
        return {'error': f'Type failed: {str(e)}'}


# ── Key Combo ─────────────────────────────────────────────────────
def press_keys(keys):
    """Press a combination of keys simultaneously (e.g. ctrl+c, win+d)."""
    try:
        # Handle format: can be "ctrl+c" or ["ctrl","c"]
        if isinstance(keys, str):
            keys = [k.strip().lower() for k in keys.split('+')]

        vk_keys = []
        for k in keys:
            vk = VK_CODES.get(k.lower())
            if vk is None:
                return {'error': f'Unknown key: {k}'}
            vk_keys.append(vk)

        # Press all keys down
        for vk in vk_keys:
            user32.keybd_event(vk, 0, KEYEVENTF_KEYDOWN, 0)
            time.sleep(0.03)

        # Release in reverse order
        for vk in reversed(vk_keys):
            user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
            time.sleep(0.03)

        return {'success': True, 'action': 'key', 'combo': '+'.join(keys)}
    except Exception as e:
        return {'error': f'Key combo failed: {str(e)}'}


# ── Scroll ────────────────────────────────────────────────────────
def scroll(direction, amount=3):
    """Scroll mouse wheel. direction: 'up' or 'down'."""
    try:
        wheel_delta = 120 * amount  # WHEEL_DELTA = 120
        if direction == 'down':
            wheel_delta = -wheel_delta

        user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, wheel_delta, 0)
        time.sleep(0.01)
        return {'success': True, 'action': 'scroll', 'direction': direction, 'amount': amount}
    except Exception as e:
        return {'error': f'Scroll failed: {str(e)}'}


# ── Open URL / App ────────────────────────────────────────────────
def open_target(target):
    """Open a URL or application."""
    try:
        os.startfile(target)
        return {'success': True, 'action': 'open', 'target': target}
    except Exception as e:
        return {'error': f'Open failed: {str(e)}'}


# ── System Commands ───────────────────────────────────────────────
def system_command(cmd):
    """Execute system commands: lock, sleep, etc."""
    try:
        if cmd == 'lock':
            user32.LockWorkStation()
            return {'success': True, 'action': 'lock'}
        elif cmd == 'sleep':
            # Set system to sleep
            ctypes.windll.powrprof.SetSuspendState(0, 1, 0)
            return {'success': True, 'action': 'sleep'}
        elif cmd == 'volume_up':
            # Simulate volume up key
            user32.keybd_event(VK_CODES['volume_up'], 0, KEYEVENTF_KEYDOWN, 0)
            user32.keybd_event(VK_CODES['volume_up'], 0, KEYEVENTF_KEYUP, 0)
            return {'success': True, 'action': 'volume_up'}
        elif cmd == 'volume_down':
            user32.keybd_event(VK_CODES['volume_down'], 0, KEYEVENTF_KEYDOWN, 0)
            user32.keybd_event(VK_CODES['volume_down'], 0, KEYEVENTF_KEYUP, 0)
            return {'success': True, 'action': 'volume_down'}
        elif cmd == 'volume_mute':
            user32.keybd_event(VK_CODES['volume_mute'], 0, KEYEVENTF_KEYDOWN, 0)
            user32.keybd_event(VK_CODES['volume_mute'], 0, KEYEVENTF_KEYUP, 0)
            return {'success': True, 'action': 'volume_mute'}
        elif cmd == 'show_desktop':
            press_keys(['win', 'd'])
            return {'success': True, 'action': 'show_desktop'}
        else:
            return {'error': f'Unknown system command: {cmd}'}
    except Exception as e:
        return {'error': f'System command failed: {str(e)}'}


# ── Get Screen Size ───────────────────────────────────────────────
def get_screen_size():
    """Return screen dimensions."""
    try:
        w = user32.GetSystemMetrics(0)  # SM_CXSCREEN
        h = user32.GetSystemMetrics(1)  # SM_CYSCREEN
        return {'success': True, 'width': w, 'height': h}
    except Exception as e:
        return {'error': f'Get screen size failed: {str(e)}'}


# ── Main dispatcher ───────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command provided'}))
        sys.exit(1)

    cmd = sys.argv[1].lower()
    args = sys.argv[2:]

    try:
        if cmd == 'screenshot':
            fmt = args[0] if args else 'base64'
            result = take_screenshot(fmt)
        elif cmd == 'click':
            x = int(args[0])
            y = int(args[1])
            btn = args[2] if len(args) > 2 else 'left'
            cnt = int(args[3]) if len(args) > 3 else 1
            result = click(x, y, btn, cnt)
        elif cmd == 'type':
            text = ' '.join(args)
            result = type_text(text)
        elif cmd == 'key':
            keys_str = ' '.join(args)
            # Parse from JSON array if given
            if keys_str.startswith('['):
                keys = json.loads(keys_str)
            else:
                keys = keys_str
            result = press_keys(keys)
        elif cmd == 'scroll':
            direction = args[0] if args else 'down'
            amount = int(args[1]) if len(args) > 1 else 3
            result = scroll(direction, amount)
        elif cmd == 'open':
            target = ' '.join(args)
            result = open_target(target)
        elif cmd == 'system':
            subcmd = args[0] if args else ''
            result = system_command(subcmd)
        elif cmd == 'screen_size':
            result = get_screen_size()
        else:
            result = {'error': f'Unknown command: {cmd}'}
    except Exception as e:
        result = {'error': str(e)}

    print(json.dumps(result))


if __name__ == '__main__':
    main()
