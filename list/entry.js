const katex = require("./katex.js")

var math = document.getElementById("math")

const createMathNode = (math_str) => {
	var newElement = document.createElement('div');
	katex.render(math_str, newElement)
	math.appendChild(newElement);
}

window.MATH_LIST.map(el=>createMathNode(el))