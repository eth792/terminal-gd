#-Includes--------------------------------------------------------------
import sys, win32com.client,re,pyautogui,time
from time import sleep
import utils.guiutils as ut


#-Sub Main--------------------------------------------------------------
def Main(excelData,cg_order):
    try:
        sleep(5)
        SapGuiAuto = win32com.client.GetObject("SAPGUI")
        if not type(SapGuiAuto) == win32com.client.CDispatch:
            return

        application = SapGuiAuto.GetScriptingEngine
        if not type(application) == win32com.client.CDispatch:
            SapGuiAuto = None
            return

        application.HistoryEnabled = False

        connection = application.Children(0)
        if not type(connection) == win32com.client.CDispatch:
            application = None
            SapGuiAuto = None
            return

        if connection.DisabledByServer == True:
            connection = None
            application = None
            SapGuiAuto = None
            return

        session = connection.Children(0)
	
        if not type(session) == win32com.client.CDispatch:
            connection = None
            application = None
            SapGuiAuto = None
            return

        if session.Busy == True:
            session = None
            connection = None
            application = None
            SapGuiAuto = None
            return

        if session.Info.IsLowSpeedConnection == True:
            session = None
            connection = None
            application = None
            SapGuiAuto = None
            return

        for index,row in excelData.iterrows():
            company = row['供应商']
            projectName = row['单体工程名称']
            projectType = row['类别']
            break

        session.findById("wnd[0]/usr/cntlIMAGE_CONTAINER/shellcont/shell/shellcont[0]/shell").doubleClickNode("F00080")
        try:
            session.findById("wnd[0]/tbar[1]/btn[8]").press()
        except:
            print("凭证概览已打开")
        ut.click(r'D:\code\desktop\desktop\image\create_order.png')
        ut.click(r'D:\code\desktop\desktop\image\cg_order.png')
        # try:
        #     ut.click(r'D:\code\desktop\desktop\image\title_open.png')
        # except:
        #     print('标题已打开')
        sleep(1.5)
        session.findById("wnd[0]/usr/ctxtSP$00026-LOW").text = str(int(float(cg_order)))
        session.findById("wnd[0]/usr/ctxtSP$00026-LOW").caretPosition = 3
        session.findById("wnd[0]").sendVKey(0)

        ut.click(r'D:\code\desktop\desktop\image\open.png')
        ut.click(r'D:\code\desktop\desktop\image\accept.png')
        ut.click(r'D:\code\desktop\desktop\image\execute.png')

        try:
            sleep(1)
            session.findById("wnd[1]/tbar[0]/btn[0]").press();
            return '没有满足选择标准的数据存在'
        except:
            print("数据正常")

        ut.doubleclick(r'D:\code\desktop\desktop\image\open_order_info.png')

        time.sleep(1)

        tree = session.findById("wnd[0]/shellcont/shell/shellcont[1]/shell[1]")
        cghh_list  = []
        for index, row in excelData.iterrows():
            orderItmeNum = str(int(row['采购申请号行号']))
            cghh_list.append(orderItmeNum)
        for id in tree.GetAllNodeKeys():
            if len(cghh_list) == 0:
                break
            order_item = tree.GetNodeTextByKey(id)
            if order_item in cghh_list:
                tree.selectNode(id)
                cghh_list.remove(order_item)
        if len(cghh_list) > 0:
            return ('行号信息不完整')

        time.sleep(1)
        ut.click(r'D:\code\desktop\desktop\image\cy.PNG')

        try:
            sleep(1)
            ut.click(r'D:\code\desktop\desktop\image\title_open.png')
        except:
            print('标签栏已打开')

        sleep(1)
        name = find_name(session)
        try:
            session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT9").select()
        except:
            print("不用重新选择")
        name = find_name(session)
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT9/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1221/ctxtMEPO1222-EKORG").text = "15A0"
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT9/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1221/ctxtMEPO1222-EKORG").setFocus()
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT9/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1221/ctxtMEPO1222-EKORG").caretPosition = 3
        session.findById(f"wnd[0]").sendVKey(0)
        name = find_name(session)
        company_list = ['广东安普迪康电气技术有限公司','湖北鄂电协力科创电器有限责任公司','北京四方继保工程技术有限公司',
                        '浙江润春电力设备有限公司','深圳市沃尔核材股份有限公司','湖北既济电力集团有限公司','河北兴洲电缆有限公司','吉唯达(上海)电气有限公司',
                        '吉唯达（上海）电气有限公司',
                        '长缆电工科技股份有限公司','宜昌市S东明电气有限责任公司','湖北紫电电气集团有限公司','三变科技股份有限公司','河北万方线缆集团有限公司',
                        '湖南高阳电瓷电器有限公司']
        company_map = {"广东安普迪康电气技术有限公司":"1000109457",
                       "湖北鄂电协力科创电器有限责任公司": "1000009202",
                       "北京四方继保工程技术有限公司": "1000014926",
                       "浙江润春电力设备有限公司": "1000325583",
                       "深圳市沃尔核材股份有限公司": "1000005475",
                       "湖北既济电力集团有限公司": "1000624620",
                       "河北兴洲电缆有限公司": "1000023722",
                       "吉唯达(上海)电气有限公司": "1000003033",
                       "吉唯达（上海）电气有限公司": "1000003033",
                       "长缆电工科技股份有限公司": "1000000436",
                       "宜昌市东明电气有限责任公司": "1000048373",
                       "湖北紫电电气集团有限公司":"1000023881",
                       "三变科技股份有限公司": "1000001915",
                       "河北万方线缆集团有限公司": "1000002551",
                       "湖南高阳电瓷电器有限公司": "1000046273"
                       }
        company = company.strip()
        if company in company_list:
            company = company_map[company]

        session.findById(f"wnd[0]/usr/sub{name}/subSUB0:SAPLMEGUI:0030/subSUB1:SAPLMEGUI:1105/ctxtMEPO_TOPLINE-SUPERFIELD").text = company
        session.findById(f"wnd[0]/usr/sub{name}/subSUB0:SAPLMEGUI:0030/subSUB1:SAPLMEGUI:1105/ctxtMEPO_TOPLINE-SUPERFIELD").setFocus()
        session.findById(f"wnd[0]/usr/sub{name}/subSUB0:SAPLMEGUI:0030/subSUB1:SAPLMEGUI:1105/ctxtMEPO_TOPLINE-SUPERFIELD").caretPosition = 42
        session.findById(f"wnd[0]").sendVKey(0)
        ## 选择公司
        i = 3
        while i < 70:
            try:
                cmElement = session.findById(f"wnd[1]/usr/lbl[1,{i}]")
                print(cmElement.text)
                print(cmElement.text.strip() == company.strip())
                if cmElement.text.strip() == company.strip():
                    cmElement.setFocus()
                    session.findById("wnd[1]").sendVKey(2)
                    break
            except:
                print(f"公司名字未找到{i}")
            finally:
                i = i+1

        company_errro = session.findById("wnd[0]/sbar").text
        if company_errro == f'供应商{company}不存在主记录':
            return "公司信息不正确"

        name = find_name(session)
        company_name = session.findById(f"wnd[0]/usr/sub{name}/subSUB0:SAPLMEGUI:0030/subSUB1:SAPLMEGUI:1105/ctxtMEPO_TOPLINE-SUPERFIELD").text
        if company_name == '':
            return "公司信息不正确"

        name = find_name(session)
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT3").select()
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT3/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1230/subTEXTS:SAPLMMTE:0100/subEDITOR:SAPLMMTE:0101/cntlTEXT_EDITOR_0101/shellcont/shell").text = projectName
        name = find_name(session)
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT1").select()
        session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT1/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1226/ctxtMEPO1226-ZTERM").text = "TA01"
        session.findById(f"wnd[0]").sendVKey(0)

        ## 收起标题栏
        try:
            ut.click(r'D:\code\desktop\desktop\image\title.png')
        except:
            print('标题已经收起')
        sleep(1)




        for index,row in excelData.iterrows():
            if projectType == "新住配完善":
                wlPrice = row['含税单价']
            else:
                wlPrice = row['不含税单价']
            bm = row['物料编码']
            i = 0
            for i in range(len(excelData)):
                name = find_name(session)
                wlbm = session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/ctxtMEPO1211-EMATN[4,{i}]").text
                if str(bm) == str(wlbm):
                    name = find_name(session)
                    session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/txtMEPO1211-NETPR[10,{i}]").text = wlPrice
                    session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/txtMEPO1211-NETPR[10,{i}]").setFocus()
                    session.findById(f"wnd[0]").sendVKey(0)
                    try:
                        name = find_name(session)
                        session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/txtMEPO1211-WAERS[11,{i}]").text = 'RMB'
                        session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/txtMEPO1211-WAERS[11,{i}]").setFocus()
                        session.findById(f"wnd[0]").sendVKey(0)
                    except Exception as e:
                        print('rmb字段不需要填入')
                    name = find_name(session)
                    session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/txtMEPO1211-PEINH[12,{i}]").text = 1
                    session.findById(f"wnd[0]/usr/sub{name}/subSUB2:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1211/tblSAPLMEGUITC_1211/txtMEPO1211-PEINH[12,{i}]").setFocus()
                    session.findById(f"wnd[0]").sendVKey(0)
                    i = i + 1

        tax = None
        taxCode = None
        if projectType == "新住配完善":
            tax = 0
            taxCode = 'J0'
        else:
            tax = 13
            taxCode = 'U2'

        for index,row in excelData.iterrows():
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8").select()
            index = 0
            while index<10:
                name = find_name(session)
                taxText = session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1333/ssubSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtT685T-VTEXT[2,{index}]").text
                if taxText == '进项税率':
                    session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1333/ssubSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtKOMV-KBETR[3,{index}]").text = tax
                    session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1333/ssubSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtKOMV-KBETR[3,{index}]").setFocus()
                    session.findById(f"wnd[0]").sendVKey(0)
                    break
                index = index + 1
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT7").select()
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT7/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1317/ctxtMEPO1317-MWSKZ").text = taxCode
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT7/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1317/ctxtMEPO1317-MWSKZ").setFocus()
            session.findById(f"wnd[0]").sendVKey(0)
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB1:SAPLMEGUI:6000/btn%#AUTOTEXT002").press()


        for index, row in excelData.iterrows():
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8").select()
            session.findById(f"wnd[0]").sendVKey(0)
            index = 0
            while index < 10:
                name = find_name(session)
                taxText = session.findById(
                    f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1333/ssubSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtT685T-VTEXT[2,{index}]").text
                if taxText == '进项税率':
                    session.findById(
                        f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1333/ssubSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtKOMV-KBETR[3,{index}]").text = tax
                    session.findById(
                        f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT8/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1333/ssubSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtKOMV-KBETR[3,{index}]").setFocus()
                    session.findById(f"wnd[0]").sendVKey(0)
                    break
                index = index + 1
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT7").select()
            session.findById(f"wnd[0]").sendVKey(0)
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT7/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1317/ctxtMEPO1317-MWSKZ").text = taxCode
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB2:SAPLMEGUI:1303/tabsITEM_DETAIL/tabpTABIDT7/ssubTABSTRIPCONTROL1SUB:SAPLMEGUI:1317/ctxtMEPO1317-MWSKZ").setFocus()
            session.findById(f"wnd[0]").sendVKey(0)
            name = find_name(session)
            session.findById(f"wnd[0]/usr/sub{name}/subSUB3:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1301/subSUB1:SAPLMEGUI:6000/btn%#AUTOTEXT001").press()

        ## 选择条件菜单
        # try:
        #     ut.click(r'D:\code\desktop\desktop\image\title_open.png')
        # except:
        #     print('标题已打开')
        sleep(1)

        ut.click(r'D:\code\desktop\desktop\image\save.png')
        try:
            time.sleep(1)
            error_message = session.findById("wnd[1]/usr/lbl[7,5]").text
            session.findById("wnd[1]/tbar[0]/btn[0]").press()
            if '超出预算' in error_message:
                error_message = '超预算'
            return error_message
        except:
            print("无错误信息")

        try:
            error_message = session.findById("wnd[1]/usr/txtSPOP-TEXTLINE1").text
            if '凭证仍有错' in error_message:
                error_message='凭证仍有错'
                session.findById("wnd[1]/usr/btnCANCEL").press()
                return error_message
            elif '系统消息已发出' in error_message:
                print("继续保存")
        except:
            print("无错误")
        sleep(1)
        ut.click(r'D:\code\desktop\desktop\image\save1.png')
        session.findById("wnd[0]/sbar").doubleClick()
        result = session.findById("wnd[1]/usr/lbl[1,2]").text
        order_num = re.findall(r'\d+',result)
        session.findById("wnd[1]/tbar[0]/btn[0]").press()
        session.findById("wnd[0]/tbar[0]/btn[3]").press()
        return int(order_num[0])

        # name = find_name(session)
        # session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT2").select()
        # name = find_name(session)
        # sum_price = session.findById(f"wnd[0]/usr/sub{name}/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT2/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1236/subSUB0:SAPLV69A:6201/tblSAPLV69ATCTRL_KONDITIONEN/txtKOMV-KWERT[7,3]").text
        # if abs(float(sum_price.strip().replace(',','')) - totalprice) < 10:
        #     sleep(1)
        #     ut.click(r'D:\code\desktop\desktop\image\save.png')
        #     sleep(1)
        #     ut.click(r'D:\code\desktop\desktop\image\save1.png')
        #     session.findById("wnd[0]/sbar").doubleClick()
        #     result = session.findById("wnd[1]/usr/lbl[1,2]").text
        #     order_num = re.findall(r'\d+',result)
        #     session.findById("wnd[1]/tbar[0]/btn[0]").press()
        #     session.findById("wnd[0]/tbar[0]/btn[3]").press()
        #     return int(order_num[0])
        # else:
        #     return '订单金额不正确'


    except Exception as e:
        print(f"操作时错误：{e}")
        raise
    finally:
        application.HistoryEnabled = True
        session = None
        connection = None
        application = None
        SapGuiAuto = None

def find_name(session):
    usr = session.findById("wnd[0]/usr")
    for element in usr.Children:
        name = element.Name
        if 'SUB0:SAPLMEGUI' in name:
            return name
    return None
