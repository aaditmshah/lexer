if (typeof module === "object" && typeof module.exports === "object") module.exports = Lexer;

Lexer.defunct = function (char) {
    throw new Error("Unexpected character at index " + (this.index - 1) + ": " + char);
};

Lexer.prototype.setInput = function (input) {
    this.input = input;
};

function Lexer(defunct) {
    if (typeof defunct !== "function") defunct = Lexer.defunct;

    var that = this;
    var rules = [];
    var remove = 0;
    this.state = 0;
    this.index = 0;
    this.input = "";

    this.addRule = function (pattern, action, start) {
        if (!pattern.global) {
            var flags = "g";
            if (pattern.multiline) flags += "m";
            if (pattern.ignoreCase) flags += "i";
            pattern = new RegExp(pattern.source, flags);
        }

        if (Object.prototype.toString.call(start) !== "[object Array]") start = [0];

        rules.push({
            pattern: pattern,
            action: action,
            start: start
        });
    };

    this.lex = function () {
        this.reject = true;

        while (this.index <= this.input.length) {
            var matches = scan().splice(remove);
            var index = this.index;

            while (matches.length) {
                if (this.reject) {
                    var match = matches.shift();
                    var result = match.result;
                    var length = match.length;
                    this.index += length;
                    this.reject = false;
                    remove++;

                    var token = match.action.apply(this, result);
                    if (this.reject) this.index = result.index;
                    else if (typeof token !== "undefined") {
                        if (length) remove = 0;
                        return token;
                    }
                } else break;
            }

            var input = this.input;

            if (index < input.length) {
                if (this.reject) {
                    remove = 0;
                    var token = defunct.call(this, input.charAt(this.index++));
                    if (typeof token !== "undefined") return token;
                } else {
                    if (this.index !== index) remove = 0;
                    this.reject = true;
                }
            } else break;
        }
    };

    function scan() {
        var matches = [];

        var state = that.state;
        var lastIndex = that.index;
        var input = that.input;

        for (var i = 0, length = rules.length; i < length; i++) {
            var rule = rules[i];
            var start = rule.start;
            var states = start.length;

            if ((!states || start.indexOf(state) >= 0) ||
                (state % 2 && states === 1 && !start[0])) {
                var pattern = rule.pattern;
                pattern.lastIndex = lastIndex;
                var result = pattern.exec(input);

                if (result && result.index === lastIndex) {
                    var j = matches.length;

                    matches.push({
                        result: result,
                        action: rule.action,
                        length: result[0].length
                    });

                    while (j--) {
                        var k = j + 1;

                        if (matches[k].length > matches[j].length) {
                            var temple = matches[j];
                            matches[j] = matches[k];
                            matches[k] = temple;
                        }
                    }
                }
            }
        }

        return matches;
    }
}
