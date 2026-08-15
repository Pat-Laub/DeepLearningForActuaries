-- Print-only replacements for RevealJS media and arbitrary content.
-- Authors provide the static images; this extension requires only Quarto.

local script_file = PANDOC_SCRIPT_FILE
if not pandoc.path.is_absolute(script_file) then
  script_file = pandoc.path.normalize(
    pandoc.path.join({pandoc.system.get_working_directory(), script_file})
  )
end
local script_dir = pandoc.path.directory(script_file)

local function html_escape(value)
  return value:gsub("&", "&amp;"):gsub('"', "&quot;"):gsub("<", "&lt;"):gsub(">", "&gt;")
end
local function input_dir()
  local input = quarto.doc.input_file
  return input and pandoc.path.directory(input) or pandoc.system.get_working_directory()
end

local function source_path(src)
  local clean = src:gsub("[?#].*$", "")
  if pandoc.path.is_absolute(clean) then return clean end
  return pandoc.path.normalize(pandoc.path.join({input_dir(), clean}))
end

local function file_exists(path)
  local handle = io.open(path, "rb")
  if not handle then return false end
  handle:close()
  return true
end

local function register_resource(src)
  local path = source_path(src)
  if not file_exists(path) then
    io.stderr:write("print-media: replacement not found: " .. path .. "\n")
    return false
  end
  quarto.doc.add_resource(path)
  return true
end

local function sidecar_for(src)
  if src:match("^https?://") or src:match("^data:") then return nil end
  local clean, suffix = src:match("^(.-)([?#].*)$")
  clean = clean or src
  suffix = suffix or ""
  local stem = clean:match("^(.*)%.[^./]+$")
  if not stem then return nil end
  for _, ext in ipairs({"png", "jpg", "jpeg", "webp", "svg"}) do
    local candidate = stem .. ".print." .. ext .. suffix
    if file_exists(source_path(candidate)) then return candidate end
  end
end

local function replacement_for(element, source)
  if element.attributes["print-replace"] == "false" then return nil end
  return element.attributes["print-src"] or (source and sidecar_for(source))
end

local function strip_print_attributes(attr)
  local attributes = {}
  for key, value in pairs(attr.attributes) do
    if not key:match("^print%-") then attributes[key] = value end
  end
  return pandoc.Attr(attr.identifier, attr.classes, attributes)
end

local function transform_image(image)
  local print_src = replacement_for(image, image.src)
  if not print_src or not register_resource(print_src) then return nil end

  local result = image:clone()
  result.attr = strip_print_attributes(image.attr)
  result.attributes["data-print-media-src"] = print_src
  local print_alt = image.attributes["print-alt"]
  if print_alt then result.attributes["data-print-media-alt"] = print_alt end
  result.classes:insert("print-media-source")
  return result
end

local function transform_div(div)
  local print_src = replacement_for(div, nil)
  if not print_src or not register_resource(print_src) then return nil end

  local print_alt = div.attributes["print-alt"] or "Print replacement"
  local live = pandoc.Div(div.content, strip_print_attributes(div.attr))
  live.identifier = ""
  live.classes:insert("print-media-live")
  local still = pandoc.Div(
    {pandoc.Plain({pandoc.Image({pandoc.Str(print_alt)}, print_src)})},
    pandoc.Attr("", {"print-media-static"})
  )
  return pandoc.Div({live, still}, pandoc.Attr("", {"print-media", "print-media-block"}))
end

local function transform_span(span)
  local print_src = replacement_for(span, nil)
  if not print_src or not register_resource(print_src) then return nil end

  local print_alt = span.attributes["print-alt"] or "Print replacement"
  local live = pandoc.Span(span.content, strip_print_attributes(span.attr))
  live.identifier = ""
  live.classes:insert("print-media-live")
  local still = pandoc.Span(
    {pandoc.Image({pandoc.Str(print_alt)}, print_src)},
    pandoc.Attr("", {"print-media-static"})
  )
  return pandoc.Span({live, still}, pandoc.Attr("", {"print-media", "print-media-inline"}))
end

local function youtube_id(url)
  return url:match("youtube%.com/embed/([%w_-]+)")
      or url:match("youtube%.com/watch%?[^\"']*v=([%w_-]+)")
      or url:match("youtu%.be/([%w_-]+)")
end

local function attr_value(html, name)
  return html:match(name .. '%s*=%s*"([^"]*)"') or html:match(name .. "%s*=%s*'([^']*)'")
end

local function size_style(html)
  local declarations = {"object-fit:contain"}
  for _, name in ipairs({"width", "height"}) do
    local value = attr_value(html, name)
    if value and value:match("^%d+$") then value = value .. "px" end
    if value then table.insert(declarations, name .. ":" .. value) end
  end
  return table.concat(declarations, ";")
end

local function youtube_wrapper(iframe, src, id)
  local thumbnail = "https://i.ytimg.com/vi/" .. id .. "/maxresdefault.jpg"
  local fallback_thumbnail = "https://i.ytimg.com/vi/" .. id .. "/hqdefault.jpg"
  local watch_url = "https://www.youtube.com/watch?v=" .. id
  local start = src:match("[?&]start=(%d+)") or src:match("[?&]t=(%d+)")
  if start then watch_url = watch_url .. "&t=" .. start .. "s" end
  return '<div class="print-media print-media-block">' ..
    '<div class="print-media-live">' .. iframe .. '</div>' ..
    '<div class="print-media-static print-media-youtube">' ..
    '<a href="' .. html_escape(watch_url) .. '"><img src="' .. html_escape(thumbnail) ..
    '" data-print-media-fallback-src="' .. html_escape(fallback_thumbnail) ..
    '" style="' .. size_style(iframe) ..
    '" alt="YouTube video thumbnail"></a></div></div>'
end

local function transform_raw(raw)
  if raw.format ~= "html" or raw.text:match('class="[^"]*print%-media') then return nil end
  local changed = false
  local html = raw.text:gsub("(<iframe%s.-</iframe>)", function(iframe)
    local src = attr_value(iframe, "src")
    local id = src and youtube_id(src)
    if not id then return iframe end
    changed = true
    return youtube_wrapper(iframe, src, id)
  end)
  if not changed then return nil end
  if raw.t == "RawInline" then return pandoc.RawInline("html", html) end
  return pandoc.RawBlock("html", html)
end

function Pandoc(doc)
  if not quarto.doc.is_format("revealjs") then return doc end

  doc = doc:walk({
    RawBlock = transform_raw,
    RawInline = transform_raw,
    Image = transform_image,
    Div = transform_div,
    Span = transform_span,
  })

  quarto.doc.add_html_dependency({
    name = "print-media",
    version = "0.2.1",
    scripts = {pandoc.path.join({script_dir, "print-media.js"})},
    stylesheets = {pandoc.path.join({script_dir, "print-media.css"})},
  })
  return doc
end
