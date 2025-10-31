import time,pyautogui


def wait_and_locate_image(image_path: str, confidence: float =0.8, timeout: int = 2 ,interval: float = 0.5):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            location = pyautogui.locateOnScreen(image_path,confidence=confidence)
            if location:
                return  location

            time.sleep(interval)
        except:
            time.sleep(interval)
    return None

def click(image_path: str,confidence: float =0.8):
    button = wait_and_locate_image(image_path,confidence)
    if button:
        pyautogui.click(button)
    else:
        print(f"点击按钮失败{image_path}")

def doubleclick(image_path: str):
    button = wait_and_locate_image(image_path)
    if button:
        pyautogui.doubleClick(button)
    else:
        print(f"点击按钮失败{image_path}")
