
use wasm_bindgen::prelude::*;


#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Str(String),
    Num(f64),
    Bool(bool),
    Nil,
    Ident(String),
    Call { name: String, args: Vec<Expr> },
    Binary { op: String, l: Box<Expr>, r: Box<Expr> },
}

#[derive(Debug, Clone, PartialEq)]
pub enum Stmt {
    While { cond: Expr, body: Vec<Stmt> },
    If { cond: Expr, then: Vec<Stmt>, otherwise: Vec<Stmt> },
    Let { name: String, value: Expr },
    Assign { name: String, value: Expr },
    Expr(Expr),
}


#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Lang {
    Lua,
    Js,
    Python,
    Ruby,
    Java,
}

impl Lang {
    pub fn parse(s: &str) -> Option<Lang> {
        match s.to_lowercase().as_str() {
            "lua" => Some(Lang::Lua),
            "js" | "javascript" => Some(Lang::Js),
            "py" | "python" => Some(Lang::Python),
            "rb" | "ruby" => Some(Lang::Ruby),
            "java" => Some(Lang::Java),
            _ => None,
        }
    }
}


#[derive(Debug, Clone, PartialEq)]
enum Tok {
    Str(String),
    Num(f64),
    Ident(String),
    Sym(&'static str),
    Eof,
}

static EOF: Tok = Tok::Eof;

const SYMS: &[&str] = &[
    "==", "~=", "!=", "<=", ">=", "&&", "||", "..", "(", ")", "{", "}", ",", ";", "=", "<", ">",
    "+", "-", "*", "/",
];

fn starts(c: &[char], i: usize, s: &str) -> bool {
    let mut j = i;
    for sc in s.chars() {
        if j >= c.len() || c[j] != sc {
            return false;
        }
        j += 1;
    }
    true
}

fn lex(src: &str, lang: Lang) -> Result<Vec<Tok>, String> {
    let c: Vec<char> = src.chars().collect();
    let comment = match lang {
        Lang::Lua => "--",
        Lang::Js | Lang::Java => "//",
        Lang::Python | Lang::Ruby => "#",
    };
    let mut i = 0;
    let mut out = Vec::new();

    'outer: while i < c.len() {
        let ch = c[i];
        if ch.is_whitespace() {
            i += 1;
            continue;
        }
        if starts(&c, i, comment) {
            while i < c.len() && c[i] != '\n' {
                i += 1;
            }
            continue;
        }
        if ch == '"' || ch == '\'' {
            let q = ch;
            i += 1;
            let mut s = String::new();
            loop {
                if i >= c.len() {
                    return Err("unterminated string".into());
                }
                if c[i] == q {
                    i += 1;
                    break;
                }
                if c[i] == '\\' && i + 1 < c.len() {
                    i += 1;
                    s.push(match c[i] {
                        'n' => '\n',
                        't' => '\t',
                        o => o,
                    });
                    i += 1;
                    continue;
                }
                s.push(c[i]);
                i += 1;
            }
            out.push(Tok::Str(s));
            continue;
        }
        if ch.is_ascii_digit() {
            let st = i;
            while i < c.len()
                && (c[i].is_ascii_digit()
                    || (c[i] == '.' && i + 1 < c.len() && c[i + 1].is_ascii_digit()))
            {
                i += 1;
            }
            let t: String = c[st..i].iter().collect();
            let n = t.parse::<f64>().map_err(|_| format!("bad number '{t}'"))?;
            out.push(Tok::Num(n));
            continue;
        }
        if ch.is_alphabetic() || ch == '_' {
            let st = i;
            i += 1;
            while i < c.len() {
                if c[i].is_alphanumeric() || c[i] == '_' {
                    i += 1;
                } else if c[i] == '.'
                    && i + 1 < c.len()
                    && (c[i + 1].is_alphabetic() || c[i + 1] == '_')
                {
                    i += 1;
                } else {
                    break;
                }
            }
            out.push(Tok::Ident(c[st..i].iter().collect()));
            continue;
        }
        for s in SYMS {
            if starts(&c, i, s) {
                out.push(Tok::Sym(s));
                i += s.len();
                continue 'outer;
            }
        }
        return Err(format!("unexpected character '{ch}'"));
    }
    Ok(out)
}


struct Parser {
    t: Vec<Tok>,
    p: usize,
    lang: Lang,
}

impl Parser {
    fn peek(&self) -> &Tok {
        self.t.get(self.p).unwrap_or(&EOF)
    }
    fn next(&mut self) -> Tok {
        let t = self.peek().clone();
        self.p += 1;
        t
    }
    fn is_sym(&self, s: &str) -> bool {
        matches!(self.peek(), Tok::Sym(x) if *x == s)
    }
    fn is_kw(&self, s: &str) -> bool {
        matches!(self.peek(), Tok::Ident(x) if x == s)
    }
    fn accept_sym(&mut self, s: &str) -> bool {
        if self.is_sym(s) {
            self.p += 1;
            true
        } else {
            false
        }
    }
    fn eat_sym(&mut self, s: &str) -> Result<(), String> {
        if self.accept_sym(s) {
            Ok(())
        } else {
            Err(format!("expected '{}', found {:?}", s, self.peek()))
        }
    }
    fn eat_kw(&mut self, s: &str) -> Result<(), String> {
        if self.is_kw(s) {
            self.p += 1;
            Ok(())
        } else {
            Err(format!("expected '{}', found {:?}", s, self.peek()))
        }
    }
    fn ident(&mut self) -> Result<String, String> {
        match self.next() {
            Tok::Ident(s) => Ok(s),
            t => Err(format!("expected a name, found {:?}", t)),
        }
    }

    fn at_stop(&self, stop: &[&str]) -> bool {
        match self.peek() {
            Tok::Ident(x) => stop.contains(&x.as_str()),
            Tok::Sym(x) => stop.contains(x),
            _ => false,
        }
    }

    fn block(&mut self, stop: &[&str]) -> Result<Vec<Stmt>, String> {
        let mut v = Vec::new();
        while *self.peek() != Tok::Eof && !self.at_stop(stop) {
            v.push(self.stmt()?);
        }
        Ok(v)
    }

    fn stmt(&mut self) -> Result<Stmt, String> {
        match self.lang {
            Lang::Lua => self.stmt_lua(),
            Lang::Js | Lang::Python | Lang::Ruby | Lang::Java => self.stmt_js(),
        }
    }

    fn stmt_lua(&mut self) -> Result<Stmt, String> {
        if self.is_kw("while") {
            self.p += 1;
            let cond = self.expr(0)?;
            self.eat_kw("do")?;
            let body = self.block(&["end"])?;
            self.eat_kw("end")?;
            return Ok(Stmt::While { cond, body });
        }
        if self.is_kw("if") {
            self.p += 1;
            return self.lua_if();
        }
        if self.is_kw("local") {
            self.p += 1;
            let name = self.ident()?;
            self.eat_sym("=")?;
            let value = self.expr(0)?;
            return Ok(Stmt::Let { name, value });
        }
        self.simple()
    }

    fn lua_if(&mut self) -> Result<Stmt, String> {
        let cond = self.expr(0)?;
        self.eat_kw("then")?;
        let then = self.block(&["else", "elseif", "end"])?;
        let otherwise = if self.is_kw("elseif") {
            self.p += 1;
            vec![self.lua_if()?]
        } else if self.is_kw("else") {
            self.p += 1;
            let b = self.block(&["end"])?;
            self.eat_kw("end")?;
            b
        } else {
            self.eat_kw("end")?;
            Vec::new()
        };
        Ok(Stmt::If { cond, then, otherwise })
    }

    fn stmt_js(&mut self) -> Result<Stmt, String> {
        if self.is_kw("while") {
            self.p += 1;
            self.eat_sym("(")?;
            let cond = self.expr(0)?;
            self.eat_sym(")")?;
            let body = self.js_block()?;
            return Ok(Stmt::While { cond, body });
        }
        if self.is_kw("if") {
            self.p += 1;
            return self.js_if();
        }
        if self.is_kw("let") || self.is_kw("const") || self.is_kw("var")
            || (self.lang == Lang::Java && ["int", "double", "float", "long", "boolean", "String", "char"].iter().any(|kw| self.is_kw(kw))) {
            self.p += 1;
            let name = self.ident()?;
            self.eat_sym("=")?;
            let value = self.expr(0)?;
            self.accept_sym(";");
            return Ok(Stmt::Let { name, value });
        }
        self.simple()
    }

    fn js_block(&mut self) -> Result<Vec<Stmt>, String> {
        self.eat_sym("{")?;
        let b = self.block(&["}"])?;
        self.eat_sym("}")?;
        Ok(b)
    }

    fn js_if(&mut self) -> Result<Stmt, String> {
        self.eat_sym("(")?;
        let cond = self.expr(0)?;
        self.eat_sym(")")?;
        let then = self.js_block()?;
        let otherwise = if self.is_kw("else") {
            self.p += 1;
            if self.is_kw("if") {
                self.p += 1;
                vec![self.js_if()?]
            } else {
                self.js_block()?
            }
        } else {
            Vec::new()
        };
        Ok(Stmt::If { cond, then, otherwise })
    }

    fn simple(&mut self) -> Result<Stmt, String> {
        if let Tok::Ident(name) = self.peek().clone() {
            if matches!(self.t.get(self.p + 1), Some(Tok::Sym("="))) {
                self.p += 2;
                let value = self.expr(0)?;
                self.accept_sym(";");
                return Ok(Stmt::Assign { name, value });
            }
        }
        let e = self.expr(0)?;
        self.accept_sym(";");
        Ok(Stmt::Expr(e))
    }

    fn binop(&self) -> Option<(&'static str, u8)> {
        let js = self.lang == Lang::Js;
        match self.peek() {
            Tok::Ident(s) if !js => match s.as_str() {
                "or" => Some(("or", 1)),
                "and" => Some(("and", 2)),
                _ => None,
            },
            Tok::Sym(s) => match *s {
                "||" if js => Some(("or", 1)),
                "&&" if js => Some(("and", 2)),
                "==" => Some(("==", 3)),
                "~=" | "!=" => Some(("!=", 3)),
                "<" => Some(("<", 3)),
                "<=" => Some(("<=", 3)),
                ">" => Some((">", 3)),
                ">=" => Some((">=", 3)),
                ".." => Some(("concat", 4)),
                "+" => Some(("+", 5)),
                "-" => Some(("-", 5)),
                "*" => Some(("*", 6)),
                "/" => Some(("/", 6)),
                _ => None,
            },
            _ => None,
        }
    }

    fn expr(&mut self, min: u8) -> Result<Expr, String> {
        let mut l = self.primary()?;
        while let Some((op, prec)) = self.binop() {
            if prec < min {
                break;
            }
            self.p += 1;
            let r = self.expr(prec + 1)?;
            l = Expr::Binary { op: op.to_string(), l: Box::new(l), r: Box::new(r) };
        }
        Ok(l)
    }

    fn primary(&mut self) -> Result<Expr, String> {
        match self.next() {
            Tok::Str(s) => Ok(Expr::Str(s)),
            Tok::Num(n) => Ok(Expr::Num(n)),
            Tok::Sym("(") => {
                let e = self.expr(0)?;
                self.eat_sym(")")?;
                Ok(e)
            }
            Tok::Sym("-") => match self.primary()? {
                Expr::Num(n) => Ok(Expr::Num(-n)),
                _ => Err("unary minus is only supported on numbers".into()),
            },
            Tok::Ident(name) => {
                match name.as_str() {
                    "true" | "True" => return Ok(Expr::Bool(true)),
                    "false" | "False" => return Ok(Expr::Bool(false)),
                    "nil" | "null" | "None" => return Ok(Expr::Nil),
                    _ => {}
                }
                if self.accept_sym("(") {
                    let mut args = Vec::new();
                    if !self.is_sym(")") {
                        loop {
                            args.push(self.expr(0)?);
                            if !self.accept_sym(",") {
                                break;
                            }
                        }
                    }
                    self.eat_sym(")")?;
                    Ok(Expr::Call { name, args })
                } else {
                    Ok(Expr::Ident(name))
                }
            }
            t => Err(format!("unexpected token {:?}", t)),
        }
    }
}

fn normalize_python(src: &str) -> Result<String, String> {
    let mut result = String::new();
    let mut blocks: Vec<(usize, bool)> = Vec::new();
    for (line_no, raw) in src.lines().enumerate() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') { continue; }
        let indent = raw.chars().take_while(|c| *c == ' ' || *c == '\t').map(|c| if c == '\t' { 4 } else { 1 }).sum::<usize>();
        let is_else = line == "else:";
        let is_elif = line.starts_with("elif ") && line.ends_with(':');
        while blocks.last().is_some_and(|(level, _)| *level > indent || (*level == indent && !is_else && !is_elif)) {
            blocks.pop(); result.push_str("}\n");
        }
        if is_else || is_elif {
            if !blocks.last().is_some_and(|(level, is_if)| *level == indent && *is_if) {
                return Err(format!("Python line {}: '{}' without matching if", line_no + 1, line));
            }
            if is_else { result.push_str("} else {\n"); }
            else { result.push_str(&format!("}} else if ({}) {{\n", line[5..line.len()-1].trim())); }
            continue;
        }
        if let Some(rest) = line.strip_prefix("if ").filter(|s| s.ends_with(':')) {
            result.push_str(&format!("if ({}) {{\n", rest[..rest.len()-1].trim()));
            blocks.push((indent, true));
        } else if let Some(rest) = line.strip_prefix("while ").filter(|s| s.ends_with(':')) {
            result.push_str(&format!("while ({}) {{\n", rest[..rest.len()-1].trim()));
            blocks.push((indent, false));
        } else {
            result.push_str(line); result.push('\n');
        }
    }
    while blocks.pop().is_some() { result.push_str("}\n"); }
    Ok(result)
}

fn normalize_ruby(src: &str) -> Result<String, String> {
    let mut result = String::new();
    let mut blocks: Vec<bool> = Vec::new();
    for raw in src.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') { continue; }
        if line == "end" {
            if blocks.pop().is_none() { return Err("unexpected 'end'".into()); }
            result.push_str("}\n");
        } else if line == "else" || line.starts_with("elsif ") {
            if !blocks.last().copied().unwrap_or(false) { return Err(format!("'{}' without matching if", line)); }
            if line == "else" { result.push_str("} else {\n"); }
            else { result.push_str(&format!("}} else if ({}) {{\n", line[6..].trim().trim_end_matches(" then"))); }
        } else if let Some(rest) = line.strip_prefix("if ") {
            let cond = rest.trim_end_matches(" then").trim();
            result.push_str(&format!("if ({}) {{\n", cond)); blocks.push(true);
        } else if let Some(rest) = line.strip_prefix("while ") {
            let cond = rest.trim_end_matches(" do").trim();
            result.push_str(&format!("while ({}) {{\n", cond)); blocks.push(false);
        } else if let Some(rest) = line.strip_prefix("puts ").or_else(|| line.strip_prefix("print ")) {
            result.push_str(&format!("puts({})\n", rest));
        } else {
            result.push_str(line); result.push('\n');
        }
    }
    if !blocks.is_empty() { return Err("missing 'end' for Ruby block".into()); }
    Ok(result)
}

pub fn parse(src: &str, lang: Lang) -> Result<Vec<Stmt>, String> {
    let normalized;
    let src = match lang {
        Lang::Python => { normalized = normalize_python(src)?; normalized.as_str() }
        Lang::Ruby => { normalized = normalize_ruby(src)?; normalized.as_str() }
        _ => src,
    };
    let mut p = Parser { t: lex(src, lang)?, p: 0, lang };
    let stop: &[&str] = match lang {
        Lang::Lua => &["end", "else", "elseif"],
        Lang::Js | Lang::Python | Lang::Ruby | Lang::Java => &["}"],
    };
    let prog = p.block(stop)?;
    if *p.peek() != Tok::Eof {
        return Err(format!("unexpected {:?} at top level", p.peek()));
    }
    Ok(prog)
}


fn tag(e: &Expr) -> &'static str {
    match e {
        Expr::Str(_) => "STRING",
        Expr::Num(_) => "NUMBER",
        Expr::Bool(_) => "BOOL",
        Expr::Nil => "NIL",
        Expr::Ident(_) => "VAR",
        _ => "EXPR",
    }
}

fn fmt_num(n: f64) -> String {
    if n.fract() == 0.0 {
        format!("{}", n as i64)
    } else {
        format!("{}", n)
    }
}

fn val(e: &Expr) -> String {
    match e {
        Expr::Str(s) => s.clone(),
        Expr::Num(n) => fmt_num(*n),
        Expr::Bool(b) => (if *b { "TRUE" } else { "FALSE" }).to_string(),
        Expr::Nil => "NIL".to_string(),
        Expr::Ident(n) => n.clone(),
        _ => inline(e),
    }
}

fn inline(e: &Expr) -> String {
    match e {
        Expr::Str(s) => format!("\"{}\"", s),
        Expr::Call { name, args } => {
            let a: Vec<String> = args.iter().map(inline).collect();
            format!("{}({})", name, a.join(", "))
        }
        Expr::Binary { op, l, r } => {
            format!("({} {} {})", inline(l), op.to_uppercase(), inline(r))
        }
        other => val(other),
    }
}

fn emit(stmts: &[Stmt], out: &mut Vec<String>) {
    for s in stmts {
        match s {
            Stmt::While { cond, body } => {
                if matches!(cond, Expr::Bool(true)) {
                    out.push("LOOP[INFINITE][TRUE]".into());
                } else {
                    out.push(format!("LOOP[WHILE][{}]", inline(cond)));
                }
                emit(body, out);
                out.push("END".into());
            }
            Stmt::If { cond, then, otherwise } => {
                out.push(format!("IF[{}]", inline(cond)));
                emit(then, out);
                if !otherwise.is_empty() {
                    out.push("ELSE".into());
                    emit(otherwise, out);
                }
                out.push("END".into());
            }
            Stmt::Let { name, value } => {
                out.push(format!("LET[{}][{}][{}]", name, tag(value), val(value)))
            }
            Stmt::Assign { name, value } => {
                out.push(format!("SET[{}][{}][{}]", name, tag(value), val(value)))
            }
            Stmt::Expr(Expr::Call { name, args }) => {
                let mut line = if name == "print" || name == "console.log" {
                    "PRINT".to_string()
                } else {
                    format!("CALL[{}]", name)
                };
                for a in args {
                    line.push_str(&format!("[{}][{}]", tag(a), val(a)));
                }
                out.push(line);
            }
            Stmt::Expr(e) => out.push(format!("EXPR[{}]", inline(e))),
        }
    }
}


fn expr_source(e: &Expr, lang: Lang) -> String {
    match e {
        Expr::Str(s) => format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\"")),
        Expr::Num(n) => fmt_num(*n),
        Expr::Bool(b) => match (lang, b) { (Lang::Python, true) => "True".into(), (Lang::Python, false) => "False".into(), (_, true) => "true".into(), (_, false) => "false".into() },
        Expr::Nil => match lang { Lang::Lua | Lang::Ruby => "nil".into(), Lang::Python => "None".into(), Lang::Js | Lang::Java => "null".into() },
        Expr::Ident(n) => n.clone(),
        Expr::Call { name, args } => {
            let name = if lang == Lang::Java && ["console.log", "print", "puts", "System.out.println"].contains(&name.as_str()) { "System.out.println" } else if ["console.log", "System.out.println"].contains(&name.as_str()) && lang != Lang::Js { if lang == Lang::Ruby { "puts" } else { "print" } } else if lang == Lang::Ruby && ["console.log", "print", "puts"].contains(&name.as_str()) { "puts" } else if name == "print" && lang == Lang::Js { "console.log" } else { name };
            format!("{}({})", name, args.iter().map(|a| expr_source(a, lang)).collect::<Vec<_>>().join(", "))
        }
        Expr::Binary { op, l, r } => {
            let operator = match (op.as_str(), lang) { ("and", Lang::Python | Lang::Ruby | Lang::Lua) => "and", ("or", Lang::Python | Lang::Ruby | Lang::Lua) => "or", ("and", Lang::Js | Lang::Java) => "&&", ("or", Lang::Js | Lang::Java) => "||", ("!=", Lang::Lua) => "~=", ("~=", Lang::Java) => "!=", ("concat", Lang::Lua) => "..", ("concat", _) => "+", _ => op };
            format!("({} {} {})", expr_source(l, lang), operator, expr_source(r, lang))
        }
    }
}

fn emit_source(stmts: &[Stmt], lang: Lang, depth: usize, out: &mut Vec<String>) {
    let pad = "    ".repeat(depth);
    for s in stmts {
        match s {
            Stmt::While { cond, body } => match lang {
                Lang::Python => { out.push(format!("{}while {}:", pad, expr_source(cond, lang))); emit_source(body, lang, depth+1, out); }
                Lang::Lua => { out.push(format!("{}while {} do", pad, expr_source(cond, lang))); emit_source(body, lang, depth+1, out); out.push(format!("{}end", pad)); }
                Lang::Ruby => { out.push(format!("{}while {}", pad, expr_source(cond, lang))); emit_source(body, lang, depth+1, out); out.push(format!("{}end", pad)); }
                Lang::Js | Lang::Java => { out.push(format!("{}while ({}) {{", pad, expr_source(cond, lang))); emit_source(body, lang, depth+1, out); out.push(format!("{}}}", pad)); }
            },
            Stmt::If { cond, then, otherwise } => match lang {
                Lang::Python => { out.push(format!("{}if {}:", pad, expr_source(cond, lang))); emit_source(then, lang, depth+1, out); if !otherwise.is_empty() { out.push(format!("{}else:", pad)); emit_source(otherwise, lang, depth+1, out); } }
                Lang::Lua => { out.push(format!("{}if {} then", pad, expr_source(cond, lang))); emit_source(then, lang, depth+1, out); if !otherwise.is_empty() { out.push(format!("{}else", pad)); emit_source(otherwise, lang, depth+1, out); } out.push(format!("{}end", pad)); }
                Lang::Ruby => { out.push(format!("{}if {}", pad, expr_source(cond, lang))); emit_source(then, lang, depth+1, out); if !otherwise.is_empty() { out.push(format!("{}else", pad)); emit_source(otherwise, lang, depth+1, out); } out.push(format!("{}end", pad)); }
                Lang::Js | Lang::Java => { out.push(format!("{}if ({}) {{", pad, expr_source(cond, lang))); emit_source(then, lang, depth+1, out); if !otherwise.is_empty() { out.push(format!("{}}} else {{", pad)); emit_source(otherwise, lang, depth+1, out); } out.push(format!("{}}}", pad)); }
            },
            Stmt::Let { name, value } => { let prefix = match lang { Lang::Python | Lang::Ruby => "", Lang::Lua => "local ", Lang::Js => "let ", Lang::Java => "var " }; let suffix = if lang == Lang::Js || lang == Lang::Java { ";" } else { "" }; out.push(format!("{}{}{} = {}{}", pad, prefix, name, expr_source(value, lang), suffix)); }
            Stmt::Assign { name, value } => { let suffix = if lang == Lang::Js || lang == Lang::Java { ";" } else { "" }; out.push(format!("{}{} = {}{}", pad, name, expr_source(value, lang), suffix)); }
            Stmt::Expr(e) => { let suffix = if lang == Lang::Js || lang == Lang::Java { ";" } else { "" }; out.push(format!("{}{}{}", pad, expr_source(e, lang), suffix)); }
        }
    }
}

pub fn translate_between(src: &str, from: &str, to: &str) -> Result<String, String> {
    let from_lang = Lang::parse(from).ok_or_else(|| format!("unknown source language '{from}'"))?;
    let to_lang = Lang::parse(to).ok_or_else(|| format!("unknown target language '{to}'"))?;
    if from_lang == to_lang { return Ok(src.to_string()); }
    let ast = parse(src, from_lang)?;
    let mut out = Vec::new();
    emit_source(&ast, to_lang, 0, &mut out);
    Ok(out.join("\n"))
}

pub fn translate_str(src: &str, from: &str) -> Result<String, String> {
    let lang = Lang::parse(from).ok_or_else(|| format!("unknown language '{from}'"))?;
    let ast = parse(src, lang)?;
    let mut out = Vec::new();
    emit(&ast, &mut out);
    Ok(out.join("\n"))
}

#[wasm_bindgen]
pub fn translate(src: &str, from: &str) -> Result<String, JsValue> {
    translate_str(src, from).map_err(|e| JsValue::from_str(&e))
}

#[wasm_bindgen]
pub fn translate_to(src: &str, from: &str, to: &str) -> Result<String, JsValue> {
    translate_between(src, from, to).map_err(|e| JsValue::from_str(&e))
}


#[cfg(test)]
mod tests {
    use super::*;

    const EXPECTED: &str = "LOOP[INFINITE][TRUE]\nPRINT[STRING][hi]\nEND";

    #[test]
    fn lua_infinite_loop() {
        let src = "while true do\n  print(\"hi\")\nend";
        assert_eq!(translate_str(src, "lua").unwrap(), EXPECTED);
    }

    #[test]
    fn js_infinite_loop() {
        let src = "while (true) {\n  console.log(\"hi\");\n}";
        assert_eq!(translate_str(src, "js").unwrap(), EXPECTED);
    }

    #[test]
    fn lua_if_elseif_else() {
        let src = "local x = 5\nif x > 3 then print(\"big\") elseif x == 3 then print(3) else print(\"small\") end";
        let out = translate_str(src, "lua").unwrap();
        assert_eq!(
            out,
            "LET[x][NUMBER][5]\nIF[(x > 3)]\nPRINT[STRING][big]\nELSE\nIF[(x == 3)]\nPRINT[NUMBER][3]\nELSE\nPRINT[STRING][small]\nEND\nEND"
        );
    }

    #[test]
    fn errors_are_reported() {
        assert!(translate_str("while true do", "lua").is_err());
        assert!(translate_str("x", "cobol").is_err());
    }
}
