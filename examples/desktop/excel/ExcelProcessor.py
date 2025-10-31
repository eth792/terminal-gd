import pandas as pd
import re

class ExcelProcessor:
    """
    一个用于处理Excel/CSV文件的工具类，提供读取和分组数据的功能。
    """
    def __init__(self, file_path):
        """
        初始化ExcelProcessor实例。

        Args:
            file_path (str): 要处理的Excel或CSV文件的路径。
        """
        self.file_path = file_path
        self.df = None  # 用于存储读取到的DataFrame

    """
        sq_number:申请订单号
        sc_numder：生成的采购订单号
    """
    def changeData(self,sq_number,gys_data,sc_numder):
        for index,row in self.df.iterrows():
            if row['采购申请号'] == sq_number:
                row['采购订单号'] = sc_numder
                for index1,row1 in gys_data.iterrows():
                    if row['采购申请号行号'] == row1['采购申请号行号']:
                        # self.df.loc[index,'采购订单号'] = sc_numder
                        self.df.loc[index, '信息'] = sc_numder
        with pd.ExcelWriter(self.file_path) as writer:
            self.df.to_excel(writer,index= True)

    def read_data(self):
        """
        读取Excel或CSV文件到DataFrame。
        支持 .xlsx 和 .csv 格式。

        Returns:
            pandas.DataFrame or None: 如果成功读取，返回DataFrame；否则返回None。
        """
        if not self.file_path:
            print("错误：文件路径未指定。")
            return None

        file_extension = self.file_path.split('.')[-1].lower()

        try:
            if file_extension == 'xlsx':
                self.df = pd.read_excel(self.file_path)
            elif file_extension == 'csv':
                self.df = pd.read_csv(self.file_path)
            else:
                print(f"错误：不支持的文件格式 '{file_extension}'。目前只支持 .xlsx 和 .csv。")
                return None

            return self.df

        except FileNotFoundError:
            print(f"错误：文件 '{self.file_path}' 未找到。请检查文件路径是否正确。")
            return None
        except pd.errors.EmptyDataError:
            print(f"警告：文件 '{self.file_path}' 是空的或不包含数据。")
            return None
        except Exception as e:
            print(f"读取文件时发生错误：{e}")
            return None

    def group_by_column(self, column_name):
        """
        根据指定的列名对数据进行分组。

        Args:
            column_name (str): 用于分组的列的名称。

        Returns:
            dict: 一个字典，键是分组列的值，值是包含该组所有行的DataFrame。
                  如果数据未读取或指定列不存在，则返回空字典。
        """
        if self.df is None:
            print("错误：数据尚未读取。请先调用 read_data() 方法。")
            return {}

        if column_name not in self.df.columns:
            print(f"错误：DataFrame中未找到列 '{column_name}'。请检查列名是否正确。")
            print(f"可用列名：{list(self.df.columns)}")
            return {}

        grouped_data = {}
        for group_value, group_df in self.df.groupby(column_name):
            grouped_data[group_value] = group_df

        return grouped_data

    def group_data_by_column(self, data,column_name):
        """
        根据指定的列名对数据进行分组。

        Args:
            column_name (str): 用于分组的列的名称。

        Returns:
            dict: 一个字典，键是分组列的值，值是包含该组所有行的DataFrame。
                  如果数据未读取或指定列不存在，则返回空字典。
        """
        if data is None:
            print("错误：数据尚未读取。请先调用 read_data() 方法。")
            return {}

        if column_name not in data.columns:
            print(f"错误：DataFrame中未找到列 '{column_name}'。请检查列名是否正确。")
            print(f"可用列名：{list(self.df.columns)}")
            return {}

        grouped_data = {}
        for group_value, group_df in data.groupby(column_name):
            grouped_data[group_value] = group_df

        return grouped_data

# --- 使用示例 ---
if __name__ == "__main__":
    dd = 'dafdsafdsa1000314270采购申请号'
    order_num = re.findall(r'\d+',dd)
    print(int(order_num[0]))
    print(str(int(order_num[0])))
