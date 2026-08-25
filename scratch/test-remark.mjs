import { remark } from "remark";
import html from "remark-html";
import math from "remark-math";
import gfm from "remark-gfm";

const text = `U \\vert\\psi\\rangle`;

remark()
  .use(gfm)
  .use(math)
  .use(html)
  .process(text)
  .then(file => console.log(String(file)));
