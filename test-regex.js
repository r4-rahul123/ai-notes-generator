const str = 'A_\\psi and B^\\dagger';
console.log('Original:', str);
const replaced = str.replace(/(\^|_)\\([a-zA-Z]+)/g, "$1{\\$2}");
console.log('Replaced:', replaced);
