const fs = require('fs');
const path = 'src/components/SiswaView.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `  const getAllTableData = () => {
    return filteredStudents.map((std, index) => {`;
const replacement1 = `  const getAllTableData = (studentsList: typeof students) => {
    return studentsList.map((std, index) => {`;
content = content.replace(target1, replacement1);

const target2 = `  const getTableDataForPDF = () => {
    return filteredStudents.map((std, index) => [`;
const replacement2 = `  const getTableDataForPDF = (studentsList: typeof students) => {
    return studentsList.map((std, index) => [`;
content = content.replace(target2, replacement2);

fs.writeFileSync(path, content, 'utf8');
console.log('Refactored data functions');
