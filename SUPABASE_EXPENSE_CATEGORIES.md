# Supabase 消费分类表说明

本文档记录 `expense_categories` 表的用途、字段含义、推荐 SQL 和 App 端维护规则，避免后续忘记如何修改这张表。

## 表用途

`public.expense_categories` 用来保存每个登录用户自己的消费分类结构。

分类最多三层：

- 一级分类：`parent_id is null`
- 二级分类：`parent_id = 一级分类 id`
- 三级分类：`parent_id = 二级分类 id`

App 里右上角菜单的“分类设置”会读写这张表。未登录时仍使用本地 `localStorage`。

## 推荐表结构

```sql
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.expense_categories(id) on delete cascade,
  parent_label text,
  path_label text,
  label text not null,
  icon text default 'other',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 字段说明

| 字段 | 含义 |
|---|---|
| `id` | 分类自己的唯一 ID。App 用它维护父子关系。 |
| `user_id` | 分类所属用户。必须等于当前 Supabase 登录用户。 |
| `parent_id` | 父分类 ID。一级分类为空。 |
| `parent_label` | 父分类名称，只是为了在 Supabase 表里更好看。 |
| `path_label` | 完整路径，例如 `餐饮 / 早餐 / 包子`。 |
| `label` | 当前分类名称，例如 `早餐`。 |
| `icon` | 图标 key，例如 `food`、`transport`、`shopping`、`home`、`fun`、`health`、`other`。 |
| `sort_order` | 同一个父级下面的显示顺序，从 `0` 开始。 |
| `created_at` | 创建时间。 |
| `updated_at` | 更新时间。建议用 trigger 自动更新。 |

## 排序规则

`sort_order` 只表示“同一个父级下面”的顺序。

例如：

| label | parent_label | path_label | sort_order |
|---|---|---|---|
| 餐饮 | null | 餐饮 | 0 |
| 交通 | null | 交通 | 1 |
| 早餐 | 餐饮 | 餐饮 / 早餐 | 0 |
| 午餐 | 餐饮 | 餐饮 / 午餐 | 1 |
| 食堂 | 早餐 | 餐饮 / 早餐 / 食堂 | 0 |

App 读取云端分类时会按：

```js
.order("sort_order", { ascending: true })
.order("created_at", { ascending: true })
```

所以显示顺序优先看 `sort_order`，相同再按 `created_at` 兜底。

## RLS 策略

必须开启 RLS，让用户只能读写自己的分类：

```sql
alter table public.expense_categories enable row level security;

create policy "read own categories"
on public.expense_categories for select
using (auth.uid() = user_id);

create policy "insert own categories"
on public.expense_categories for insert
with check (auth.uid() = user_id);

create policy "update own categories"
on public.expense_categories for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own categories"
on public.expense_categories for delete
using (auth.uid() = user_id);
```

## 更新时间 Trigger

`updated_at` 不会自动变化，建议加 trigger：

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_expense_categories_updated_at
on public.expense_categories;

create trigger set_expense_categories_updated_at
before update on public.expense_categories
for each row
execute function public.set_updated_at();
```

## 旧表迁移 SQL

如果表已经存在，但缺少可读字段、时间字段或排序字段，执行：

```sql
alter table public.expense_categories
add column if not exists parent_label text,
add column if not exists path_label text,
add column if not exists sort_order integer default 0,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

update public.expense_categories
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

update public.expense_categories c
set parent_label = p.label
from public.expense_categories p
where c.parent_id = p.id;

update public.expense_categories c
set path_label = c.label
where c.parent_id is null;

update public.expense_categories c
set path_label = p.label || ' / ' || c.label
from public.expense_categories p
where c.parent_id = p.id
  and p.parent_id is null;

update public.expense_categories c
set path_label = gp.label || ' / ' || p.label || ' / ' || c.label
from public.expense_categories p
join public.expense_categories gp
  on p.parent_id = gp.id
where c.parent_id = p.id
  and p.parent_id is not null;

with ordered as (
  select
    id,
    row_number() over (
      partition by user_id, parent_id
      order by sort_order, created_at, label
    ) - 1 as next_sort_order
  from public.expense_categories
)
update public.expense_categories c
set
  sort_order = ordered.next_sort_order,
  updated_at = now()
from ordered
where c.id = ordered.id;
```

## App 端维护规则

当前 App 代码里的规则：

- 登录后调用 `refreshExpenseCategories()` 从 Supabase 拉分类。
- 如果当前用户云端没有分类，会把默认分类初始化到 `expense_categories`。
- 新增分类时，App 写入 `user_id`、`parent_id`、`parent_label`、`path_label`、`label`、`icon`、`sort_order`。
- 删除分类时，App 删除当前分类；子分类依赖数据库 `on delete cascade` 自动删除。
- 新增、删除、主动同步云端分类后，App 会按菜单当前显示顺序重写所有分类的 `sort_order`、`parent_label`、`path_label` 和 `updated_at`。
- 右上角菜单“分类设置”标题右侧的同步按钮会主动重新拉取云端分类。
- 未登录时，分类保存在浏览器 `localStorage`，key 是 `budget-gauge-categories`。

## 当前图标 Key

App 当前支持这些分类图标：

- `food`
- `transport`
- `shopping`
- `home`
- `fun`
- `health`
- `other`

如果 Supabase 中一级分类名称是 `健康`，但 `icon` 还是 `other`，App 会自动兜底显示 `health` 图标。
