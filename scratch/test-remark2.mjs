import { remark } from 'remark';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const doc = `\n\n$$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}$$\n\nusing the collapse`;
remark().use(remarkMath).use(remarkRehype).use(rehypeStringify).process(doc).then(res => console.log(res.toString()));
