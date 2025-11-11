import fs from 'fs';

const files = [
  '/Users/caron/Developer/milk/terminal-gd/data/ocr_txt/beijingheruisaierdianlikejigufen4100908541.txt',
  '/Users/caron/Developer/milk/terminal-gd/data/ocr_txt/andelijituanyouxiangongsi4100968520.txt'
];

for (const file of files) {
  const name = file.substring(file.lastIndexOf('/') + 1);
  console.log('\n' + name + ':');
  const text = fs.readFileSync(file, 'utf-8');
  const linesRaw = text.split('\n');

  let labelIdx = -1;
  for (let i = 0; i < linesRaw.length; i++) {
    if (linesRaw[i].includes('工程名称')) {
      labelIdx = i;
      break;
    }
  }

  if (labelIdx > 0) {
    const prevLine = linesRaw[labelIdx - 1];
    const indent = prevLine.length - prevLine.trimStart().length;
    console.log('  标签行索引: ' + labelIdx);
    console.log('  上一行: "' + prevLine + '"');
    console.log('  上一行缩进: ' + indent + ' 个空格');
    console.log('  上一行trim: "' + prevLine.trim() + '"');
    console.log('  上一行包含"公司|有限|集团": ' + /公司|有限|集团/.test(prevLine));
    console.log('  上一行匹配实体结尾: ' + /公司|有限|集团|工程|项目|线路|站|小区|改造/.test(prevLine));
  }
}
