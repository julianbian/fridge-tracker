import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient.js";

// 固定的“家庭账号”邮箱，密码由用户在 Supabase 后台设置；界面上只暴露密码框
const APP_LOGIN_EMAIL = "household@fridge-tracker.local";

// 常见食材默认保质期（天）：冷藏 fridge / 冷冻 freezer；units 第一项为默认单位（优先用数量，非质量）；group 用于库存分类展示
// hasSeal + sealedFridge：有开封/未开封区别的食材，fridge 为“已开封”默认值，sealedFridge 为“未开封”默认值
const SHELF_LIFE_DB = [
  { name:"绿叶蔬菜", fridge:5, freezer:240, units:["根","g"], group:"正餐" },
  { name:"根茎蔬菜（土豆/胡萝卜/洋葱）", fridge:20, freezer:240, units:["个","g"], group:"正餐" },
  { name:"西红柿", fridge:7, freezer:180, units:["个","g"], group:"正餐" },
  { name:"黄瓜/茄子", fridge:5, freezer:180, units:["根","g"], group:"正餐" },
  { name:"菌菇类", fridge:5, freezer:180, units:["朵","g"], group:"正餐" },
  { name:"鸡蛋", fridge:30, freezer:0, units:["个","g"], group:"正餐" },
  { name:"牛奶（开封）", fridge:5, freezer:60, units:["ml"], group:"零食", hasSeal:true, sealedFridge:14 },
  { name:"酸奶", fridge:5, freezer:60, units:["盒","g"], group:"零食", hasSeal:true, sealedFridge:14 },
  { name:"奶酪", fridge:10, freezer:180, units:["片","g"], group:"零食", hasSeal:true, sealedFridge:21 },
  { name:"黄油", fridge:30, freezer:270, units:["块","g"], group:"正餐", hasSeal:true, sealedFridge:60 },
  { name:"生猪/牛/羊肉", fridge:3, freezer:120, units:["份","g"], group:"正餐" },
  { name:"生鸡鸭肉", fridge:2, freezer:270, units:["个","g"], group:"正餐" },
  { name:"绞肉/肉馅", fridge:2, freezer:90, units:["g","份"], group:"正餐" },
  { name:"鱼/虾/海鲜", fridge:2, freezer:90, units:["只","g"], group:"正餐" },
  { name:"火腿/培根/香肠（开封）", fridge:7, freezer:60, units:["根","g"], group:"正餐", hasSeal:true, sealedFridge:14 },
  { name:"豆腐/豆制品", fridge:4, freezer:90, units:["块","g"], group:"正餐" },
  { name:"熟食/剩菜", fridge:3, freezer:90, units:["份","g"], group:"正餐" },
  { name:"速冻饺子/馄饨/丸子", fridge:1, freezer:180, units:["个","g"], group:"正餐" },
  { name:"面包/馒头", fridge:6, freezer:90, units:["个","g"], group:"正餐" },
  { name:"水果（浆果类）", fridge:4, freezer:240, units:["盒","g"], group:"水果" },
  { name:"水果（苹果/柑橘等）", fridge:25, freezer:180, units:["个","g"], group:"水果" },
  { name:"酱料/果酱（开封）", fridge:45, freezer:0, units:["瓶","g"], group:"零食", hasSeal:true, sealedFridge:270 },
  { name:"冰淇淋", fridge:0, freezer:60, units:["盒","ml"], group:"零食" },
  { name:"其他/自定义", fridge:7, freezer:90, units:["份","g"], group:"正餐" },
];

// 具体食材名 -> 所属类别（用于联想输入 + 自动估算保质期/单位，不限制用户实际输入）
const FOOD_INDEX = [
  { name:"菠菜", category:"绿叶蔬菜" }, { name:"生菜", category:"绿叶蔬菜" }, { name:"白菜", category:"绿叶蔬菜" },
  { name:"油菜", category:"绿叶蔬菜" }, { name:"韭菜", category:"绿叶蔬菜" }, { name:"芹菜", category:"绿叶蔬菜" },
  { name:"空心菜", category:"绿叶蔬菜" }, { name:"小白菜", category:"绿叶蔬菜" }, { name:"苋菜", category:"绿叶蔬菜" },
  { name:"上海青", category:"绿叶蔬菜" }, { name:"青菜", category:"绿叶蔬菜" },
  { name:"娃娃菜", category:"绿叶蔬菜", units:["颗","g"] },
  { name:"香菜", category:"绿叶蔬菜" }, { name:"香葱", category:"绿叶蔬菜" }, { name:"小葱", category:"绿叶蔬菜" },
  { name:"茼蒿", category:"绿叶蔬菜" }, { name:"荠菜", category:"绿叶蔬菜" }, { name:"菜心", category:"绿叶蔬菜" },
  { name:"生菜叶", category:"绿叶蔬菜" }, { name:"莴笋叶", category:"绿叶蔬菜" },
  { name:"土豆", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" }, { name:"红薯", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"胡萝卜", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" }, { name:"洋葱", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"大蒜", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" }, { name:"生姜", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"山药", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" }, { name:"芋头", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"白萝卜", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"大葱", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"玉米", category:"根茎蔬菜（土豆/胡萝卜/洋葱）", units:["根","g"] },
  { name:"莲藕", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" }, { name:"荸荠", category:"根茎蔬菜（土豆/胡萝卜/洋葱）" },
  { name:"西红柿", category:"西红柿" }, { name:"番茄", category:"西红柿" }, { name:"圣女果", category:"西红柿" },
  { name:"小番茄", category:"西红柿" },
  { name:"黄瓜", category:"黄瓜/茄子" }, { name:"茄子", category:"黄瓜/茄子" }, { name:"青椒", category:"黄瓜/茄子" },
  { name:"彩椒", category:"黄瓜/茄子" }, { name:"南瓜", category:"黄瓜/茄子" }, { name:"丝瓜", category:"黄瓜/茄子" },
  { name:"冬瓜", category:"黄瓜/茄子" }, { name:"苦瓜", category:"黄瓜/茄子" },
  { name:"西兰花", category:"黄瓜/茄子" }, { name:"花菜", category:"黄瓜/茄子" }, { name:"豆角", category:"黄瓜/茄子" },
  { name:"四季豆", category:"黄瓜/茄子" }, { name:"秋葵", category:"黄瓜/茄子" }, { name:"芦笋", category:"黄瓜/茄子" },
  { name:"香菇", category:"菌菇类" }, { name:"金针菇", category:"菌菇类" }, { name:"平菇", category:"菌菇类" },
  { name:"杏鲍菇", category:"菌菇类" }, { name:"蘑菇", category:"菌菇类" }, { name:"木耳", category:"菌菇类" },
  { name:"草菇", category:"菌菇类" }, { name:"茶树菇", category:"菌菇类" }, { name:"银耳", category:"菌菇类" },
  { name:"鸡蛋", category:"鸡蛋" }, { name:"鸭蛋", category:"鸡蛋" }, { name:"鹌鹑蛋", category:"鸡蛋" },
  { name:"咸鸭蛋", category:"鸡蛋" }, { name:"皮蛋", category:"鸡蛋" },
  { name:"牛奶", category:"牛奶（开封）" }, { name:"豆浆", category:"牛奶（开封）" },
  { name:"酸奶", category:"酸奶" },
  { name:"奶酪", category:"奶酪" }, { name:"芝士", category:"奶酪" },
  { name:"芝士片", category:"奶酪" }, { name:"车达芝士", category:"奶酪" }, { name:"奶油芝士", category:"奶酪" },
  { name:"马苏里拉芝士", category:"奶酪", hasSeal:true, fridge:3, sealedFridge:14 },
  { name:"黄油", category:"黄油" }, { name:"奶油", category:"黄油" }, { name:"淡奶油", category:"黄油" },
  { name:"猪肉", category:"生猪/牛/羊肉" }, { name:"牛肉", category:"生猪/牛/羊肉" }, { name:"羊肉", category:"生猪/牛/羊肉" },
  { name:"排骨", category:"生猪/牛/羊肉" }, { name:"五花肉", category:"生猪/牛/羊肉" }, { name:"牛排", category:"生猪/牛/羊肉" },
  { name:"里脊肉", category:"生猪/牛/羊肉" }, { name:"牛腩", category:"生猪/牛/羊肉" }, { name:"羊排", category:"生猪/牛/羊肉" },
  { name:"猪蹄", category:"生猪/牛/羊肉" }, { name:"猪肝", category:"生猪/牛/羊肉" },
  { name:"鸡肉", category:"生鸡鸭肉" }, { name:"鸡胸肉", category:"生鸡鸭肉" }, { name:"鸡腿", category:"生鸡鸭肉" },
  { name:"鸭肉", category:"生鸡鸭肉" }, { name:"鸡翅", category:"生鸡鸭肉" },
  { name:"鸡爪", category:"生鸡鸭肉" }, { name:"鸭腿", category:"生鸡鸭肉" }, { name:"整鸡", category:"生鸡鸭肉" },
  { name:"猪肉馅", category:"绞肉/肉馅" }, { name:"牛肉馅", category:"绞肉/肉馅" }, { name:"肉末", category:"绞肉/肉馅" },
  { name:"鱼肉馅", category:"绞肉/肉馅" },
  { name:"鱼", category:"鱼/虾/海鲜" }, { name:"虾", category:"鱼/虾/海鲜" }, { name:"螃蟹", category:"鱼/虾/海鲜" },
  { name:"鱿鱼", category:"鱼/虾/海鲜" }, { name:"三文鱼", category:"鱼/虾/海鲜" }, { name:"带鱼", category:"鱼/虾/海鲜" },
  { name:"生蚝", category:"鱼/虾/海鲜" }, { name:"扇贝", category:"鱼/虾/海鲜" },
  { name:"基围虾", category:"鱼/虾/海鲜" }, { name:"皮皮虾", category:"鱼/虾/海鲜" }, { name:"蛤蜊", category:"鱼/虾/海鲜" },
  { name:"鲈鱼", category:"鱼/虾/海鲜" }, { name:"鳕鱼", category:"鱼/虾/海鲜" }, { name:"罗非鱼", category:"鱼/虾/海鲜" },
  { name:"火腿", category:"火腿/培根/香肠（开封）" }, { name:"培根", category:"火腿/培根/香肠（开封）" },
  { name:"香肠", category:"火腿/培根/香肠（开封）" }, { name:"午餐肉", category:"火腿/培根/香肠（开封）" },
  { name:"腊肠", category:"火腿/培根/香肠（开封）" }, { name:"烤肠", category:"火腿/培根/香肠（开封）" },
  { name:"咸肉", category:"火腿/培根/香肠（开封）" },
  { name:"豆腐", category:"豆腐/豆制品", hasSeal:true, fridge:3, sealedFridge:10 },
  { name:"豆干", category:"豆腐/豆制品" }, { name:"腐竹", category:"豆腐/豆制品" },
  { name:"豆皮", category:"豆腐/豆制品" }, { name:"千张", category:"豆腐/豆制品" }, { name:"内酯豆腐", category:"豆腐/豆制品" },
  { name:"剩菜", category:"熟食/剩菜" }, { name:"卤菜", category:"熟食/剩菜" }, { name:"熟食", category:"熟食/剩菜" },
  { name:"烧鸭", category:"熟食/剩菜" }, { name:"白斩鸡", category:"熟食/剩菜" }, { name:"酱牛肉", category:"熟食/剩菜" },
  { name:"饺子", category:"速冻饺子/馄饨/丸子" }, { name:"馄饨", category:"速冻饺子/馄饨/丸子" },
  { name:"汤圆", category:"速冻饺子/馄饨/丸子" }, { name:"丸子", category:"速冻饺子/馄饨/丸子" },
  { name:"烧卖", category:"速冻饺子/馄饨/丸子" }, { name:"春卷", category:"速冻饺子/馄饨/丸子" },
  { name:"锅贴", category:"速冻饺子/馄饨/丸子" }, { name:"虾饺", category:"速冻饺子/馄饨/丸子" },
  { name:"面包", category:"面包/馒头" }, { name:"馒头", category:"面包/馒头" }, { name:"花卷", category:"面包/馒头" },
  { name:"吐司", category:"面包/馒头" }, { name:"包子", category:"面包/馒头" },
  { name:"贝果", category:"面包/馒头" }, { name:"生煎包", category:"面包/馒头" },
  { name:"草莓", category:"水果（浆果类）" }, { name:"蓝莓", category:"水果（浆果类）" },
  { name:"树莓", category:"水果（浆果类）" }, { name:"葡萄", category:"水果（浆果类）" }, { name:"樱桃", category:"水果（浆果类）" },
  { name:"黑莓", category:"水果（浆果类）" }, { name:"桑葚", category:"水果（浆果类）" },
  { name:"苹果", category:"水果（苹果/柑橘等）" }, { name:"橙子", category:"水果（苹果/柑橘等）" },
  { name:"香蕉", category:"水果（苹果/柑橘等）" }, { name:"橘子", category:"水果（苹果/柑橘等）" },
  { name:"柚子", category:"水果（苹果/柑橘等）" }, { name:"梨", category:"水果（苹果/柑橘等）" },
  { name:"芒果", category:"水果（苹果/柑橘等）" }, { name:"西瓜", category:"水果（苹果/柑橘等）" },
  { name:"猕猴桃", category:"水果（苹果/柑橘等）" }, { name:"桃子", category:"水果（苹果/柑橘等）" },
  { name:"柠檬", category:"水果（苹果/柑橘等）" },
  { name:"柿子", category:"水果（苹果/柑橘等）" }, { name:"石榴", category:"水果（苹果/柑橘等）" },
  { name:"火龙果", category:"水果（苹果/柑橘等）" }, { name:"菠萝", category:"水果（苹果/柑橘等）" },
  { name:"荔枝", category:"水果（苹果/柑橘等）" }, { name:"龙眼", category:"水果（苹果/柑橘等）" },
  { name:"哈密瓜", category:"水果（苹果/柑橘等）" }, { name:"木瓜", category:"水果（苹果/柑橘等）" },
  { name:"牛油果", category:"水果（苹果/柑橘等）" },
  { name:"果酱", category:"酱料/果酱（开封）" }, { name:"蛋黄酱", category:"酱料/果酱（开封）" },
  { name:"番茄酱", category:"酱料/果酱（开封）" }, { name:"沙拉酱", category:"酱料/果酱（开封）" },
  { name:"芝麻酱", category:"酱料/果酱（开封）" }, { name:"辣椒酱", category:"酱料/果酱（开封）" },
  { name:"蚝油", category:"酱料/果酱（开封）" }, { name:"甜面酱", category:"酱料/果酱（开封）" },
  { name:"花生酱", category:"酱料/果酱（开封）" },
  { name:"冰淇淋", category:"冰淇淋" }, { name:"雪糕", category:"冰淇淋" },
];

function resolveCategoryEntry(rawName) {
  const q = (rawName || "").trim();
  if (!q) return SHELF_LIFE_DB.find(d => d.name === "其他/自定义");
  const directMatch = SHELF_LIFE_DB.find(d => d.name === q);
  if (directMatch) return directMatch;
  const food = FOOD_INDEX.find(f => f.name === q);
  if (food) {
    const categoryEntry = SHELF_LIFE_DB.find(d => d.name === food.category);
    // 任意字段（units/fridge/freezer/hasSeal/sealedFridge/group）都可在具体食材上覆盖所属类别的默认值
    const { name: _n, category: _c, ...overrides } = food;
    return Object.keys(overrides).length > 0 ? { ...categoryEntry, ...overrides } : categoryEntry;
  }
  return SHELF_LIFE_DB.find(d => d.name === "其他/自定义");
}

const GROUP_ORDER = ["正餐", "零食", "水果"];

const SUGGESTION_POOL = (() => {
  const seen = new Set();
  const pool = [];
  FOOD_INDEX.forEach(f => {
    if (!seen.has(f.name)) { seen.add(f.name); pool.push(f.name); }
  });
  SHELF_LIFE_DB.forEach(d => {
    if (d.name !== "其他/自定义" && !seen.has(d.name)) { seen.add(d.name); pool.push(d.name); }
  });
  return pool;
})();

// 本地 Mock 菜谱库（前端联调用，替代真实大模型调用）
const MOCK_RECIPE_DB = [
  {
    name: "香煎三文鱼",
    keywords: ["三文鱼", "鱼"],
    extra: "黄油、柠檬、盐、黑胡椒",
    fallbackUse: "三文鱼",
    steps: "1. 三文鱼两面撒盐和黑胡椒腌10分钟\n2. 平底锅放黄油烧热\n3. 鱼皮朝下煎3分钟至金黄\n4. 翻面再煎2分钟至熟\n5. 挤柠檬汁调味即可出锅",
  },
  {
    name: "快手豆腐煲",
    keywords: ["豆腐", "豆干", "香菇", "金针菇", "蘑菇"],
    extra: "生抽、葱花、蒜末",
    fallbackUse: "豆腐、香菇",
    steps: "1. 豆腐切块，香菇切片\n2. 热锅少油，爆香蒜末\n3. 下香菇翻炒，加豆腐和生抽\n4. 加少量水小火煮5分钟\n5. 出锅前撒葱花",
  },
  {
    name: "番茄炒蛋",
    keywords: ["西红柿", "番茄"],
    extra: "鸡蛋、葱花、糖",
    fallbackUse: "西红柿、鸡蛋",
    steps: "1. 鸡蛋打散调盐\n2. 热油炒散鸡蛋盛出\n3. 另起锅炒软西红柿\n4. 倒入鸡蛋翻炒均匀\n5. 加少许糖出锅",
  },
  {
    name: "蒜蓉西兰花",
    keywords: ["西兰花", "花菜"],
    extra: "大蒜、盐、蚝油",
    fallbackUse: "西兰花",
    steps: "1. 西兰花掰小朵焯水1分钟\n2. 热锅少油爆香蒜末\n3. 下西兰花大火翻炒\n4. 加盐和蚝油调味出锅",
  },
  {
    name: "空气炸锅烤鸡翅",
    keywords: ["鸡翅", "鸡腿", "鸡肉"],
    extra: "生抽、蜂蜜、料酒",
    fallbackUse: "鸡翅",
    steps: "1. 鸡翅划两刀便于入味\n2. 用生抽、蜂蜜、料酒腌制20分钟\n3. 空气炸锅200度预热\n4. 鸡翅入炸篮180度烤12分钟\n5. 翻面再烤8分钟至表皮微焦",
  },
  {
    name: "虾仁滑蛋",
    keywords: ["虾", "虾仁"],
    extra: "鸡蛋、葱花、盐",
    fallbackUse: "虾",
    steps: "1. 虾去壳挑去虾线，用盐略腌\n2. 鸡蛋打散加少许水搅匀\n3. 热锅温油滑炒虾仁至变色盛出\n4. 倒入蛋液小火轻推至半凝固\n5. 倒回虾仁快速拌匀出锅",
  },
  {
    name: "清炒时蔬",
    keywords: ["绿叶蔬菜", "菠菜", "生菜", "油菜", "娃娃菜", "青菜", "白菜", "小白菜", "上海青"],
    extra: "大蒜、盐",
    fallbackUse: "时令绿叶菜",
    steps: "1. 蔬菜洗净沥干切段\n2. 热锅倒油爆香蒜片\n3. 大火下蔬菜快速翻炒\n4. 加盐调味，断生即可出锅",
  },
  {
    name: "土豆炖牛肉",
    keywords: ["土豆", "牛肉", "牛腩"],
    extra: "生抽、八角、葱段",
    fallbackUse: "土豆、牛肉",
    steps: "1. 牛肉切块焯水去血沫\n2. 热锅爆香葱段和八角\n3. 下牛肉翻炒，加生抽和水没过食材\n4. 小火炖40分钟至牛肉软烂\n5. 加土豆块再炖15分钟收汁",
  },
];

function splitQty(qtyStr) {
  const m = (qtyStr || "").match(/^([\d.]*)(.*)$/);
  return { num: m ? m[1] : "", unit: m ? m[2] : "" };
}

function formatNum(n) {
  return String(Math.round(n * 100) / 100);
}

// Supabase 行（quantity/unit 分列）与前端 item（qty 合并字符串）之间的映射
function rowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    addedDate: row.added_date,
    qty: row.quantity != null ? formatNum(row.quantity) + (row.unit || "") : "",
    fridgeDays: row.fridge_days,
    freezerDays: row.freezer_days,
  };
}

function itemFieldsToRow({ name, location, addedDate, qty, fridgeDays, freezerDays }) {
  const { num, unit } = splitQty(qty);
  return {
    name,
    location,
    added_date: addedDate,
    quantity: num !== "" ? Number(num) : null,
    unit: unit || null,
    fridge_days: fridgeDays,
    freezer_days: freezerDays,
  };
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}
function todayStr() {
  return new Date().toISOString().slice(0,10);
}

function getStatus(item) {
  const life = item.location === "fridge" ? item.fridgeDays : item.freezerDays;
  const added = new Date(item.addedDate + "T00:00:00");
  const now = new Date(todayStr() + "T00:00:00");
  const elapsed = daysBetween(added, now);
  const remaining = life - elapsed;
  const pct = life > 0 ? Math.max(0, Math.min(1, remaining / life)) : 0;
  let status = "fresh";
  if (remaining < 0) status = "over";
  else if (life > 0 && remaining / life <= 0.15) status = "urgent";
  else if (life > 0 && remaining / life <= 0.4) status = "soon";
  return { elapsed, remaining, pct, status, life };
}

function Ring({ pct, status, size=46 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colors = { fresh:"#4C6353", soon:"#E3A23B", urgent:"#C1502E", over:"#B33A2E" };
  const offset = c * (1 - Math.max(pct, 0.03));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EAE4D3" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors[status]} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

function statusLabel(s, location) {
  if (location === "freezer") {
    if (s.status === "over") return "冷冻已久，建议尽快处理";
    if (s.status === "urgent") return "品质下降中";
    if (s.status === "soon") return "建议近期食用";
    return "冷冻新鲜";
  }
  if (s.status === "over") return "已过期，建议检查/丢弃";
  if (s.status === "urgent") return "临期，尽快吃";
  if (s.status === "soon") return "建议近期食用";
  return "新鲜";
}

function PasswordGate({ onUnlocked }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: APP_LOGIN_EMAIL,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("密码不对，再试一下");
      return;
    }
    onUnlocked(data.session);
  }

  return (
    <div className="ft-gate-wrap">
      <form className="ft-gate-card" onSubmit={submit}>
        <div className="ft-title">冰箱台账</div>
        <div className="ft-gate-hint">输入密码解锁，这台设备之后会记住</div>
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
        />
        {error && <div className="ft-gate-error">{error}</div>}
        <button className="ft-add-btn" type="submit" disabled={loading}>
          {loading ? "验证中…" : "解锁"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState("all");
  const [name, setName] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [location, setLocation] = useState("fridge");
  const [addedDate, setAddedDate] = useState(todayStr());
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState(resolveCategoryEntry("").units[0]);
  const [unitTouched, setUnitTouched] = useState(false);
  const [recipes, setRecipes] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [eatingId, setEatingId] = useState(null);
  const [eatAmount, setEatAmount] = useState("");
  const [eatUnit, setEatUnit] = useState("");
  const [sealed, setSealed] = useState(false);
  const [fridgeDaysInput, setFridgeDaysInput] = useState(String(resolveCategoryEntry("").fridge));
  const [fridgeDaysTouched, setFridgeDaysTouched] = useState(false);
  const [freezerDaysInput, setFreezerDaysInput] = useState(String(resolveCategoryEntry("").freezer));
  const [freezerDaysTouched, setFreezerDaysTouched] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("food_items")
          .select("*")
          .order("added_date", { ascending: false });
        if (error) throw error;
        setItems(data.map(rowToItem));
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    })();
  }, [session]);

  async function addItem() {
    const finalName = name.trim();
    if (!finalName) return;
    const fridgeDays = fridgeDaysInput.trim() === "" ? defaultFridgeDays : (parseInt(fridgeDaysInput, 10) || 0);
    const freezerDays = freezerDaysInput.trim() === "" ? defaultFreezerDays : (parseInt(freezerDaysInput, 10) || 0);
    const row = itemFieldsToRow({
      name: finalName,
      location,
      addedDate,
      qty: qty.trim() ? qty.trim() + unit.trim() : "",
      fridgeDays, freezerDays,
    });
    const { data, error } = await supabase.from("food_items").insert(row).select().single();
    if (error) { console.error(error); return; }
    setItems(prev => [rowToItem(data), ...(prev || [])]);
    setName("");
    setQty("");
    setUnitTouched(false);
    setSealed(false);
    setFridgeDaysTouched(false);
    setFreezerDaysTouched(false);
  }

  async function removeItem(id) {
    const prevItems = items;
    setItems((items || []).filter(i => i.id !== id));
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) { console.error(error); setItems(prevItems); }
  }

  function startEdit(item) {
    const { num, unit: qUnit } = splitQty(item.qty);
    const opts = resolveCategoryEntry(item.name).units;
    setEditDraft({
      name: item.name,
      location: item.location,
      addedDate: item.addedDate,
      qtyNum: num,
      unit: opts.includes(qUnit) ? qUnit : opts[0],
      fridgeDays: String(item.fridgeDays),
      freezerDays: String(item.freezerDays),
    });
    setEditingId(item.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  function updateEditName(newName) {
    setEditDraft(d => {
      const catEntry = resolveCategoryEntry(newName);
      const opts = catEntry.units;
      return {
        ...d,
        name: newName,
        unit: opts.includes(d.unit) ? d.unit : opts[0],
        fridgeDays: String(catEntry.fridge),
        freezerDays: String(catEntry.freezer || catEntry.fridge * 8),
      };
    });
  }

  function applyEditSealPreset(sealedChoice) {
    setEditDraft(d => {
      const catEntry = resolveCategoryEntry(d.name);
      const days = sealedChoice ? catEntry.sealedFridge : catEntry.fridge;
      return { ...d, fridgeDays: String(days) };
    });
  }

  async function saveEdit(id) {
    const finalName = editDraft.name.trim();
    if (!finalName) return;
    const fridgeDays = parseInt(editDraft.fridgeDays, 10) || 0;
    const freezerDays = parseInt(editDraft.freezerDays, 10) || 0;
    const newQty = editDraft.qtyNum.trim() ? editDraft.qtyNum.trim() + editDraft.unit : "";
    const row = itemFieldsToRow({
      name: finalName, location: editDraft.location, addedDate: editDraft.addedDate,
      qty: newQty, fridgeDays, freezerDays,
    });
    const { data, error } = await supabase.from("food_items").update(row).eq("id", id).select().single();
    if (error) { console.error(error); return; }
    setItems(prev => (prev || []).map(i => i.id === id ? rowToItem(data) : i));
    setEditingId(null);
    setEditDraft(null);
  }

  function startEat(item) {
    const { unit: qUnit } = splitQty(item.qty);
    setEatAmount("");
    setEatUnit(qUnit || resolveCategoryEntry(item.name).units[0]);
    setEatingId(item.id);
  }

  function cancelEat() {
    setEatingId(null);
    setEatAmount("");
  }

  async function confirmEat(item) {
    const amount = parseFloat(eatAmount);
    if (!amount || amount <= 0) return;
    const { num, unit: qUnit } = splitQty(item.qty);
    if (num !== "") {
      const remaining = parseFloat(num) - amount;
      if (remaining <= 0) {
        await removeItem(item.id);
      } else {
        const { data, error } = await supabase
          .from("food_items")
          .update({ quantity: Number(formatNum(remaining)), unit: qUnit || null })
          .eq("id", item.id)
          .select()
          .single();
        if (error) { console.error(error); return; }
        setItems(prev => (prev || []).map(i => i.id === item.id ? rowToItem(data) : i));
      }
    } else {
      const { data, error } = await supabase
        .from("food_items")
        .update({ quantity: Number(formatNum(amount)), unit: eatUnit || null })
        .eq("id", item.id)
        .select()
        .single();
      if (error) { console.error(error); return; }
      setItems(prev => (prev || []).map(i => i.id === item.id ? rowToItem(data) : i));
    }
    setEatingId(null);
    setEatAmount("");
  }

  function renderCard(item) {
    const hasQty = splitQty(item.qty).num !== "";
    return (
      <div key={item.id} className={"ft-card status-" + item.s.status}>
        {eatingId === item.id ? (
          <div className="ft-card-edit">
            <div className="ft-card-cat" style={{marginBottom:2}}>
              当前库存：{item.qty || "未记录数量"}
            </div>
            <div className="ft-card-edit-row">
              <input
                value={eatAmount}
                onChange={e=>setEatAmount(e.target.value)}
                placeholder={hasQty ? `吃了多少（${splitQty(item.qty).unit}）` : "还剩多少"}
                autoFocus
              />
              {!hasQty && (
                <select className="ft-qty-unit" value={eatUnit} onChange={e=>setEatUnit(e.target.value)}>
                  {resolveCategoryEntry(item.name).units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>
            {!hasQty && <div className="ft-card-cat">未记录过数量，先填一下当前还剩多少</div>}
            <div className="ft-card-edit-btns">
              <button className="ft-edit-save" onClick={()=>confirmEat(item)}>确认</button>
              <button className="ft-edit-cancel" onClick={cancelEat}>取消</button>
            </div>
          </div>
        ) : editingId === item.id ? (
          <div className="ft-card-edit">
            <input
              value={editDraft.name}
              onChange={e=>updateEditName(e.target.value)}
              placeholder="食材种类"
            />
            <div className="ft-card-edit-row">
              <select value={editDraft.location} onChange={e=>setEditDraft(d=>({ ...d, location: e.target.value }))}>
                <option value="fridge">冷藏</option>
                <option value="freezer">冷冻</option>
              </select>
              <input
                type="date"
                value={editDraft.addedDate}
                onChange={e=>setEditDraft(d=>({ ...d, addedDate: e.target.value }))}
              />
            </div>
            <div className="ft-card-edit-row">
              <input
                value={editDraft.qtyNum}
                onChange={e=>setEditDraft(d=>({ ...d, qtyNum: e.target.value }))}
                placeholder="数量"
              />
              <select
                className="ft-qty-unit"
                value={editDraft.unit}
                onChange={e=>setEditDraft(d=>({ ...d, unit: e.target.value }))}
              >
                {resolveCategoryEntry(editDraft.name).units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {resolveCategoryEntry(editDraft.name).hasSeal && editDraft.location === "fridge" && (
              <select value="" onChange={e=>{ if (e.target.value) applyEditSealPreset(e.target.value === "sealed"); }}>
                <option value="">开封状态（套用预设天数）</option>
                <option value="opened">已开封</option>
                <option value="sealed">未开封</option>
              </select>
            )}
            <div className="ft-card-edit-row">
              <input
                value={editDraft.fridgeDays}
                onChange={e=>setEditDraft(d=>({ ...d, fridgeDays: e.target.value }))}
                placeholder="冷藏保质期(天)"
              />
              <input
                value={editDraft.freezerDays}
                onChange={e=>setEditDraft(d=>({ ...d, freezerDays: e.target.value }))}
                placeholder="冷冻保质期(天)"
              />
            </div>
            <div className="ft-card-edit-btns">
              <button className="ft-edit-save" onClick={()=>saveEdit(item.id)}>保存</button>
              <button className="ft-edit-cancel" onClick={cancelEdit}>取消</button>
            </div>
          </div>
        ) : (
          <>
            <div className="ft-card-top">
              <div>
                <div className="ft-card-name">{item.name}{item.qty ? ` · ${item.qty}` : ""}</div>
                <div className="ft-card-cat">{item.location==="fridge"?"冷藏":"冷冻"} · 放入 {item.addedDate}</div>
              </div>
              <div className="ft-card-actions">
                <button className="ft-edit-btn" onClick={()=>startEat(item)} title={hasQty ? "吃了多少" : "记录当前库存"}>🍽</button>
                <button className="ft-edit-btn" onClick={()=>startEdit(item)} title="编辑">✎</button>
                <button className="ft-del" onClick={()=>removeItem(item.id)} title="删除">✕</button>
              </div>
            </div>
            <div className="ft-ring-row">
              <Ring pct={item.s.pct} status={item.s.status} />
              <div className="ft-ring-text">
                <div className="ft-days">
                  {item.s.remaining >= 0 ? `剩 ${item.s.remaining} 天` : `已超 ${-item.s.remaining} 天`}
                </div>
                <div className="ft-badge">{statusLabel(item.s, item.location)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const enriched = useMemo(() => {
    return (items || []).map(i => ({ ...i, s: getStatus(i) }))
      .sort((a,b) => a.s.remaining - b.s.remaining);
  }, [items]);

  const filtered = useMemo(() => {
    if (tab === "fridge") return enriched.filter(i => i.location === "fridge");
    if (tab === "freezer") return enriched.filter(i => i.location === "freezer");
    if (tab === "warn") return enriched.filter(i => i.s.status === "urgent" || i.s.status === "over");
    return enriched;
  }, [enriched, tab]);

  const warnCount = enriched.filter(i => i.s.status === "urgent" || i.s.status === "over").length;

  const groupedFiltered = useMemo(() => {
    const groups = {};
    GROUP_ORDER.forEach(g => { groups[g] = []; });
    filtered.forEach(item => {
      const g = resolveCategoryEntry(item.name).group || "正餐";
      (groups[g] || groups["正餐"]).push(item);
    });
    return groups;
  }, [filtered]);

  const nameSuggestions = useMemo(() => {
    const q = name.trim();
    if (!q) return SUGGESTION_POOL.slice(0, 12);
    const starts = SUGGESTION_POOL.filter(n => n.startsWith(q));
    const includes = SUGGESTION_POOL.filter(n => !n.startsWith(q) && n.includes(q));
    return [...starts, ...includes].slice(0, 12);
  }, [name]);

  const categoryEntry = useMemo(() => resolveCategoryEntry(name), [name]);
  const unitOptions = categoryEntry.units;
  const defaultFridgeDays = categoryEntry.hasSeal && sealed ? categoryEntry.sealedFridge : categoryEntry.fridge;
  const defaultFreezerDays = categoryEntry.freezer || categoryEntry.fridge * 8;

  useEffect(() => {
    if (!unitTouched || !unitOptions.includes(unit)) setUnit(unitOptions[0]);
  }, [unitOptions, unitTouched]);

  useEffect(() => {
    if (!fridgeDaysTouched) setFridgeDaysInput(String(defaultFridgeDays));
  }, [defaultFridgeDays, fridgeDaysTouched]);

  useEffect(() => {
    if (!freezerDaysTouched) setFreezerDaysInput(String(defaultFreezerDays));
  }, [defaultFreezerDays, freezerDaysTouched]);

  async function suggestRecipes() {
    const soonItems = enriched.filter(i => i.s.status === "urgent" || i.s.status === "soon" || i.s.status === "over").slice(0, 8);
    const pool = soonItems.length > 0 ? soonItems : enriched.slice(0, 8);
    if (pool.length === 0) { setRecipeError("先添加一些食材吧"); return; }
    setRecipeLoading(true);
    setRecipeError(null);
    setRecipes(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const poolNames = pool.map(i => i.name);
      const matches = MOCK_RECIPE_DB
        .map(r => ({
          recipe: r,
          matchedNames: [...new Set(poolNames.filter(n => r.keywords.some(k => n.includes(k) || k.includes(n))))],
        }))
        .filter(m => m.matchedNames.length > 0);

      let chosen;
      if (matches.length > 0) {
        chosen = matches.slice(0, 3);
      } else {
        const shuffled = [...MOCK_RECIPE_DB].sort(() => Math.random() - 0.5);
        chosen = shuffled.slice(0, 2).map(r => ({ recipe: r, matchedNames: [] }));
      }

      const parsed = chosen.map(({ recipe, matchedNames }) => {
        const stockPart = matchedNames.length > 0 ? matchedNames.join("、") : recipe.fallbackUse;
        const use = recipe.extra ? `${stockPart}、${recipe.extra}（库存外）` : stockPart;
        return { name: recipe.name, use, steps: recipe.steps };
      });

      setRecipes(parsed);
    } catch (e) {
      console.error(e);
      setRecipeError("生成推荐失败，请稍后重试");
    } finally {
      setRecipeLoading(false);
    }
  }

  if (session === undefined) {
    return <div className="ft-empty">加载中…</div>;
  }

  if (session === null) {
    return <PasswordGate onUnlocked={setSession} />;
  }

  if (items === null) {
    return <div className="ft-empty">加载中…</div>;
  }

  return (
    <div className="ft-wrap">
      <div className="ft-header">
        <div className="ft-title">冰箱台账<small>记录食材，追踪新鲜度，避免浪费</small></div>
        <div className="ft-stats">
          <div><b>{enriched.length}</b>件在库</div>
          <div><b style={{color: warnCount>0 ? "#C1502E" : "#33473A"}}>{warnCount}</b>需关注</div>
          <button className="ft-logout-btn" onClick={()=>supabase.auth.signOut()}>退出</button>
        </div>
      </div>

      <div className="ft-form">
        <div className="ft-field ft-autocomplete">
          <label>食材种类</label>
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            onFocus={()=>setShowSuggest(true)}
            onBlur={()=>setTimeout(()=>setShowSuggest(false), 150)}
            placeholder="例如：西红柿"
            autoComplete="off"
          />
          {showSuggest && nameSuggestions.length > 0 && (
            <div className="ft-suggest-list">
              {nameSuggestions.map(n => (
                <div
                  key={n}
                  className="ft-suggest-item"
                  onMouseDown={()=>{ setName(n); setShowSuggest(false); }}
                >
                  {n}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ft-field">
          <label>存放位置</label>
          <select value={location} onChange={e=>setLocation(e.target.value)}>
            <option value="fridge">冷藏</option>
            <option value="freezer">冷冻</option>
          </select>
        </div>
        <div className="ft-field">
          <label>放入日期</label>
          <input type="date" value={addedDate} onChange={e=>setAddedDate(e.target.value)} />
        </div>
        <div className="ft-field">
          <label>数量（选填）</label>
          <div className="ft-qty-row">
            <input className="ft-qty-num" value={qty} onChange={e=>setQty(e.target.value)} placeholder="如 500" />
            <select
              className="ft-qty-unit"
              value={unit}
              onChange={e=>{ setUnit(e.target.value); setUnitTouched(true); }}
            >
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        {categoryEntry.hasSeal && location === "fridge" && (
          <div className="ft-field">
            <label>开封状态</label>
            <select value={sealed ? "sealed" : "opened"} onChange={e=>setSealed(e.target.value === "sealed")}>
              <option value="opened">已开封</option>
              <option value="sealed">未开封</option>
            </select>
          </div>
        )}
        <button className="ft-add-btn" onClick={addItem}>+ 记一笔</button>
        <div className="ft-hint">保质期按常见食材经验估算自动填充，可手动调整；部分食材可选择开封状态自动套用预设天数。</div>
      </div>

      <div className="ft-tabs">
        <div className={"ft-tab" + (tab==="all"?" active":"")} onClick={()=>setTab("all")}>全部</div>
        <div className={"ft-tab" + (tab==="fridge"?" active":"")} onClick={()=>setTab("fridge")}>冷藏</div>
        <div className={"ft-tab" + (tab==="freezer"?" active":"")} onClick={()=>setTab("freezer")}>冷冻</div>
        <div className={"ft-tab" + (tab==="warn"?" active":"")} onClick={()=>setTab("warn")}>需关注 {warnCount>0 ? `(${warnCount})` : ""}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="ft-empty">这里还没有食材，添加第一件试试吧</div>
      ) : (
        GROUP_ORDER.map(g => groupedFiltered[g].length > 0 && (
          <div key={g}>
            <div className="ft-section-label"><span>{g}</span><div className="line"></div></div>
            <div className="ft-grid">
              {groupedFiltered[g].map(item => renderCard(item))}
            </div>
          </div>
        ))
      )}

      <div className="ft-section-label"><span>AI 推荐菜谱</span><div className="line"></div></div>
      <button className="ft-recipe-btn" onClick={suggestRecipes} disabled={recipeLoading}>
        {recipeLoading && <span className="ft-spin"></span>}
        {recipeLoading ? "正在思考…" : "根据现有食材推荐菜"}
      </button>
      {recipeError && <div style={{color:"#B33A2E", fontSize:13, marginTop:8}}>{recipeError}</div>}
      {recipes && (
        <div className="ft-recipe-box">
          {recipes.map((r, idx) => (
            <div key={idx} className="ft-recipe-card">
              <div className="ft-recipe-name">{r.name}</div>
              <div className="ft-recipe-use">用到：{r.use}</div>
              <div className="ft-recipe-steps">{r.steps}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
