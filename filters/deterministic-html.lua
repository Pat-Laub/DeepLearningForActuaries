--[[
Make Quarto's HTML output deterministic, replacing three post-render scripts:

  * remove_cell_ids.py        — strip the random 8-hex Jupyter cell id from
                                <div class="cell"> so it doesn't churn in git;
  * remove_execution_counts.py — drop the kernel-dependent execution_count
                                attribute from cell/cell-output divs (purely
                                informational, nothing in Quarto's HTML/CSS
                                uses it);
  * normalize_layout_attrs.py — sort layout-* attributes alphabetically.
                                Quarto's layout filter builds them by iterating
                                a Lua table with pairs(), and Lua 5.4's
                                per-process string-hash seed makes the order
                                flip between renders.

Must run `at: post-render` so it sees the quarto-layout-panel divs that
Quarto's own layout filters (pre-render -> post-render window) create.
]]

local function is_random_cell_id(id)
  return #id == 8 and id:match("^[0-9a-f]+$") ~= nil
end

local function is_layout_key(key)
  return key:match("^layout%-") ~= nil or key:match("^data%-layout%-") ~= nil
end

function Div(div)
  local changed = false

  if div.classes:includes("cell") and is_random_cell_id(div.identifier) then
    div.identifier = ""
    changed = true
  end

  -- The count sits on the outer .cell div and on inner .cell-output divs;
  -- strip it wherever it appears (as remove_execution_counts.py did).
  if div.attributes["execution_count"] ~= nil then
    div.attributes["execution_count"] = nil
    changed = true
  end

  -- Sort layout-* attributes into a canonical order, in place: collect the
  -- ordered (key, value) list, sort the layout keys among themselves, and
  -- put them back at the same positions so other attributes don't move.
  local ordered = {}
  local layout_positions = {}
  local layout_attrs = {}
  for key, value in pairs(div.attributes) do
    table.insert(ordered, { key, value })
    if is_layout_key(key) then
      table.insert(layout_positions, #ordered)
      table.insert(layout_attrs, { key, value })
    end
  end

  if #layout_attrs > 1 then
    table.sort(layout_attrs, function(a, b) return a[1] < b[1] end)
    local already_sorted = true
    for i, pos in ipairs(layout_positions) do
      if ordered[pos][1] ~= layout_attrs[i][1] then
        already_sorted = false
      end
      ordered[pos] = layout_attrs[i]
    end
    if not already_sorted then
      div.attr = pandoc.Attr(div.identifier, div.classes, ordered)
      changed = true
    end
  end

  if changed then
    return div
  end
end
