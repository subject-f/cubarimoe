import re

#############################################################################
# Cubari-Flavoured Markdown
#############################################################################
# This module handles "Cubari-Flavoured Markdown". CFM is a very dumbed down
# set of supported tags (and parsing) in order to safely inject styling to
# descriptions in things like gists.

# The supported tags are:
# - URLs
# - Headers (atx-style, parses to a single level)
# - Inline emphasis (bold, italics)
# - Inline code

# This utility also handles stripping HTML tags by replacing ", ', <, > with
# their escaped equivalents.

#############################################################################
# Example
#############################################################################
# text = """
# [This is a link](http://example.net/).

# Another inline link [here](http://example.net/).

# # Header

# ## Another header

# *some italics* _more italics_

# **some bold** __more bold__

# `code`
# """

# result = parse_html(text)

# print(result)
# | <a href="http://example.net/">This is a link</a>.
# |
# | Another inline link <a href="http://example.net/">here</a>.
# |
# | <h3>Header</h3>
# |
# | <h3>Another header</h3>
# |
# | <em>some italics</em> <em>more italics</em>
# |
# | <strong>some bold</strong> <strong>more bold</strong>
# |
# | <code>code</code>


def _convert_crlf(input_str: str) -> str:
    return input_str.encode().replace(b"\r\n", b"\n").decode("utf-8")


def _parse_links(input_str: str) -> str:
    input_str = re.sub(
        r"\[([\w\W]+?)\]\((https?:\/\/[-a-zA-Z0-9._~:/?#@!$&()*+,;=%']+)\)",
        r'<a href="\2">\1</a>',
        input_str,
        flags=re.MULTILINE,
    )
    return re.sub(
        r"(?<!href=\")(https?:\/\/[-a-zA-Z0-9._~:/?#@!$&()*+,;=%']+)",
        r'<a href="\1">\1</a>',
        input_str,
        flags=re.MULTILINE,
    )


def _parse_headers(input_str: str) -> str:
    search = re.finditer(r"^(#{1,5}) (.+)$", input_str, re.MULTILINE)
    for i in search:
        h = 2 - (min(len(i.group(1)) + 1, 5) / 10)
        input_str = re.sub(
            i.group(),
            f'<span style="font-size: {h}em;">{i.group(2)}</span>',
            input_str,
        )
    return input_str


def _parse_strong_emphasis(input_str: str) -> str:
    return "\n".join(
        re.sub(
            r"(?:\*\*|\_\_)([\w]+?[\w\W]+?[\w]+?)(?:\*\*|\_\_)",
            r"<strong>\1</strong>",
            l,
        )
        for l in input_str.splitlines()
    )


def _parse_em_emphasis(input_str: str) -> str:
    return "\n".join(
        re.sub(r"(?:\*|\_)([\w]+?[\w\W]+?[\w]+?)(?:\*|\_)", r"<em>\1</em>", l)
        for l in input_str.splitlines()
    )


def _parse_code(input_str: str) -> str:
    return "\n".join(
        re.sub(r"(?:\`)([\w]+?[\w\W]+?[\w]+?)(?:\`)", r"<code>\1</code>", l)
        for l in input_str.splitlines()
    )


def _escape(input_str: str) -> str:
    escapes = [
        ["&", "&amp;"],
        ['"', "&quot;"],
        ["'", "&#39;"],
        ["<", "&lt;"],
        [">", "&gt;"],
    ]

    intermediate_escape = input_str

    for seq, esc in escapes:
        intermediate_escape = intermediate_escape.replace(seq, esc)

    return intermediate_escape


def parse_html(input_str: str) -> str:
    parsers = [
        _convert_crlf,
        _escape,
        _parse_links,
        _parse_headers,
        _parse_strong_emphasis,
        _parse_em_emphasis,
        _parse_code,
    ]

    intermediate_parse_result = input_str

    for parser in parsers:
        intermediate_parse_result = parser(intermediate_parse_result)

    return intermediate_parse_result
