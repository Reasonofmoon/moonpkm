-- moon.nvim — MoonPKM Neovim Plugin
-- 설치: lazy.nvim 또는 packer.nvim
-- ~/.config/nvim/lua/plugins/moon.lua 에 추가

local M = {}

-- 설정 기본값
M.config = {
  vault_path = vim.fn.expand("$MOON_VAULT") ~= "$MOON_VAULT"
    and vim.fn.expand("$MOON_VAULT")
    or (vim.fn.has("wsl") == 1
      and "/mnt/c/Users/sound/Documents/MyZettelkasten"
      or vim.fn.expand("~/Documents/MyZettelkasten")),
  editor = "nvim",
  moon_cmd = "moon",  -- PATH의 moon CLI
  leader = "<leader>m",
}

-- ── 유틸리티 ──────────────────────────────────────

local function moon_run(args, callback)
  local cmd = M.config.moon_cmd .. " " .. args
  if callback then
    vim.fn.jobstart(cmd, {
      on_stdout = function(_, data) callback(data) end,
      on_exit = function(_, code)
        if code ~= 0 then
          vim.notify("moon 오류: " .. cmd, vim.log.levels.ERROR)
        end
      end,
    })
  else
    return vim.fn.system(cmd)
  end
end

local function open_terminal_split(cmd)
  vim.cmd("botright split | resize 15 | terminal " .. cmd)
end

local function get_visual_selection()
  local s_pos = vim.fn.getpos("'<")
  local e_pos = vim.fn.getpos("'>")
  local lines = vim.fn.getline(s_pos[2], e_pos[2])
  if #lines == 0 then return "" end
  lines[#lines] = string.sub(lines[#lines], 1, e_pos[3])
  lines[1] = string.sub(lines[1], s_pos[3])
  return table.concat(lines, "\n")
end

-- ── 핵심 명령 ─────────────────────────────────────

function M.capture(text)
  text = text or vim.fn.input("캡처할 내용: ")
  if text == "" then return end
  local result = moon_run('capture "' .. text:gsub('"', '\\"') .. '"')
  vim.notify("✓ " .. (result or "캡처됨"))
end

function M.capture_selection()
  local sel = get_visual_selection()
  if sel ~= "" then
    moon_run('capture "' .. sel:gsub('"', '\\"'):gsub('\n', ' ') .. '"')
    vim.notify("✓ 선택 텍스트 캡처됨")
  end
end

function M.brain_template()
  -- 현재 파일에 BRAIN 섹션 삽입
  local file = vim.fn.expand("%:p")
  if file == "" then
    vim.notify("파일을 저장 후 사용하세요", vim.log.levels.WARN)
    return
  end
  moon_run('brain "' .. file .. '"')
  vim.cmd("e!") -- 파일 다시 로드
  vim.notify("✓ BRAIN 섹션 추가됨")
end

function M.new_brain()
  local title = vim.fn.input("BRAIN 노트 제목: ")
  if title == "" then return end
  moon_run('brain --new "' .. title .. '"')
  vim.notify("✓ BRAIN 노트 생성: " .. title)
end

function M.search()
  local query = vim.fn.input("검색어: ")
  if query == "" then return end
  open_terminal_split(M.config.moon_cmd .. " search " .. vim.fn.shellescape(query))
end

function M.search_word_under_cursor()
  local word = vim.fn.expand("<cword>")
  open_terminal_split(M.config.moon_cmd .. " search " .. vim.fn.shellescape(word))
end

function M.agent_run()
  -- 에이전트 목록 가져오기
  local agents_raw = moon_run("agent list")
  local agents = {}
  for line in (agents_raw or ""):gmatch("[^\n]+") do
    local name = line:match("•%s+(%S+)")
    if name then table.insert(agents, name) end
  end

  if #agents == 0 then
    vim.notify("사용 가능한 에이전트 없음", vim.log.levels.WARN)
    return
  end

  vim.ui.select(agents, {
    prompt = "에이전트 선택:",
  }, function(choice)
    if choice then
      open_terminal_split(M.config.moon_cmd .. " agent run " .. choice)
    end
  end)
end

function M.context_pack()
  local purpose = vim.fn.input("Context Pack 목적: ")
  if purpose == "" then return end
  open_terminal_split(M.config.moon_cmd .. " context " .. vim.fn.shellescape(purpose))
end

function M.insert_wikilink()
  local query = vim.fn.input("노트 이름: ")
  if query == "" then return end
  -- 검색 결과에서 첫 번째 파일명 추출
  local result = moon_run("search " .. vim.fn.shellescape(query) .. " 2>/dev/null | head -5")
  -- 간단히 [[query]] 삽입
  local link = "[[" .. query .. "]]"
  local row, col = unpack(vim.api.nvim_win_get_cursor(0))
  vim.api.nvim_buf_set_text(0, row - 1, col, row - 1, col, { link })
end

function M.status()
  open_terminal_split(M.config.moon_cmd .. " status")
end

function M.graph()
  vim.cmd("tabnew")
  vim.cmd("terminal bash -c 'cd " .. M.config.vault_path .. " && " .. M.config.moon_cmd .. " web'")
end

-- ── 키맵 등록 ─────────────────────────────────────

function M.setup_keymaps()
  local l = M.config.leader
  local opts = { noremap = true, silent = true }

  -- Normal mode
  vim.keymap.set("n", l .. "c", M.capture, { desc = "Moon: Capture 빠른 입력" })
  vim.keymap.set("n", l .. "b", M.brain_template, { desc = "Moon: BRAIN 섹션 추가" })
  vim.keymap.set("n", l .. "B", M.new_brain, { desc = "Moon: 새 BRAIN 노트" })
  vim.keymap.set("n", l .. "s", M.search, { desc = "Moon: 검색" })
  vim.keymap.set("n", l .. "S", M.search_word_under_cursor, { desc = "Moon: 커서 단어 검색" })
  vim.keymap.set("n", l .. "a", M.agent_run, { desc = "Moon: 에이전트 실행" })
  vim.keymap.set("n", l .. "k", M.context_pack, { desc = "Moon: Context Pack 생성" })
  vim.keymap.set("n", l .. "l", M.insert_wikilink, { desc = "Moon: Wikilink 삽입" })
  vim.keymap.set("n", l .. "g", M.graph, { desc = "Moon: 그래프 뷰" })
  vim.keymap.set("n", l .. "m", M.status, { desc = "Moon: 상태 보기" })

  -- Visual mode
  vim.keymap.set("v", l .. "c", M.capture_selection, { desc = "Moon: 선택 Capture" })
end

-- ── 자동명령 (마크다운 전용) ────────────────────────

function M.setup_autocmds()
  local group = vim.api.nvim_create_augroup("MoonPKM", { clear = true })

  -- 저장 시 자동 업데이트 타임스탬프
  vim.api.nvim_create_autocmd("BufWritePre", {
    group = group,
    pattern = M.config.vault_path .. "/**/*.md",
    callback = function()
      local lines = vim.api.nvim_buf_get_lines(0, 0, 30, false)
      for i, line in ipairs(lines) do
        if line:match("^updated:") then
          local today = os.date("%Y-%m-%d")
          vim.api.nvim_buf_set_lines(0, i - 1, i, false,
            { "updated: " .. today })
          break
        end
      end
    end,
  })

  -- Vault 파일 열 때 파일타입 설정
  vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
    group = group,
    pattern = M.config.vault_path .. "/**/*.md",
    callback = function()
      vim.opt_local.conceallevel = 2
      vim.opt_local.spell = true
      vim.opt_local.spelllang = "ko,en"
      vim.opt_local.wrap = true
      vim.opt_local.linebreak = true
    end,
  })
end

-- ── Vim 명령어 등록 ──────────────────────────────────

function M.setup_vim_commands()
  vim.api.nvim_create_user_command("Moon", function(opts)
    local cmd = opts.args
    if cmd == "" then
      open_terminal_split(M.config.moon_cmd .. " --help")
    else
      open_terminal_split(M.config.moon_cmd .. " " .. cmd)
    end
  end, { nargs = "*", desc = "moon CLI 명령 실행" })

  vim.api.nvim_create_user_command("MoonCapture", function(opts)
    M.capture(opts.args)
  end, { nargs = "?", desc = "빠른 캡처" })

  vim.api.nvim_create_user_command("MoonBrain", function()
    M.brain_template()
  end, { desc = "BRAIN 섹션 추가" })

  vim.api.nvim_create_user_command("MoonSearch", function(opts)
    local q = opts.args ~= "" and opts.args or vim.fn.input("검색어: ")
    open_terminal_split(M.config.moon_cmd .. " search " .. vim.fn.shellescape(q))
  end, { nargs = "?", desc = "Vault 검색" })

  vim.api.nvim_create_user_command("MoonAgent", function(opts)
    if opts.args ~= "" then
      open_terminal_split(M.config.moon_cmd .. " agent run " .. opts.args)
    else
      M.agent_run()
    end
  end, { nargs = "?", desc = "에이전트 실행" })
end

-- ── setup 진입점 ──────────────────────────────────

function M.setup(user_config)
  if user_config then
    M.config = vim.tbl_deep_extend("force", M.config, user_config)
  end
  M.setup_keymaps()
  M.setup_autocmds()
  M.setup_vim_commands()
  vim.notify("🌙 MoonPKM 로드됨", vim.log.levels.INFO)
end

return M
