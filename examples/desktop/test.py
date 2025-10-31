
from PIL import Image, ImageDraw, ImageFont
import pyautogui, time
import utils.guiutils as ut
import sap.desktop as dt
from pywinauto import Application
from excel.ExcelProcessor import ExcelProcessor


def text_to_image(text, font_path=r'C:\Windows\Fonts\simsun', font_size=18):
    # 创建一个空白图像
    img = Image.new('RGB', (90, 30), color = (255, 255, 255))
    draw = ImageDraw.Draw(img)
    # 设置字体和大小
    font = ImageFont.truetype(font_path, font_size)
    # 在图像上绘制文本
    draw.text((4,4), text, font=font, fill=(0, 0, 0))
    return img

if __name__ == '__main__':


    # subprocess.Popen(r"C:\Program Files (x86)\SAP\FrontEnd\SAPgui\saplogon.exe")
    app = Application().start(r"C:\Program Files (x86)\SAP\FrontEnd\SAPgui\saplogon.exe")

    timeout = 10
    start_time = time.time()
    success = False


    login = ut.wait_and_locate_image(r'D:\code\desktop\desktop\image\login.png',0.8,10,0.5)


    if login:
        pyautogui.click(login)
    else:
        print("error1")

    time.sleep(2)
    pyautogui.write('AIDJ')
    pyautogui.press('tab')
    time.sleep(0.3)
    pyautogui.write('Aa-82526363')
    time.sleep(0.3)
    pyautogui.press('enter')

    ut.click(r'D:\code\desktop\desktop\image\continue_login.png')

    ut.click(r'D:\code\desktop\desktop\image\confirm_login.png')


    # time.sleep(1)
    # pyautogui.hotkey('win','up')

    ut.doubleclick(r'D:\code\desktop\desktop\image\new.png')





    file_name = 'D:\code\desktop\desktop\测试项目.xlsx'
    # file_name = 'D:\code\desktop\测试项目.xlsx'

    # 1. 创建 ExcelProcessor 实例
    processor = ExcelProcessor(file_name)
    # 2. 读取数据
    data_frame = processor.read_data()
    if data_frame is not None:
        # 3. 根据“采购订单号”列进行分组
        grouped_orders = processor.group_by_column('采购申请号')
        if grouped_orders:

            for po_num, po_df in grouped_orders.items():
                try:
                    dd = processor.group_data_by_column(po_df,'供应商')
                    for gys, gys_data in dd.items():
                        order= str(po_num)
                        print(f'采购申请号：{po_num}')
                        # 获取session
                        order_num = ''
                        try:
                            order_num = dt.Main(gys_data,order)
                        except:
                            print('写入订单异常')
                        finally:
                            ut.click(r'D:\code\desktop\desktop\image\close.png')
                            ut.click(r'D:\code\desktop\desktop\image\no.png')
                        processor.changeData(po_num,gys_data,order_num)
                except Exception as e:
                    print(f'制作订单出错{e}')

        else:
            print("未获取到分组数据，请检查文件内容或列名。")
    else:
        print("数据读取失败，无法进行分组操作。")

    app.kill_()




