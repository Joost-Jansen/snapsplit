-- SnapSplit Database Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- 1. Users table (synced with Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. Groups
-- ============================================
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. Group Members
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

-- ============================================
-- 4. Expenses
-- ============================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    receipt_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. Receipt Items
-- ============================================
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. Item Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS public.item_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_item_id UUID NOT NULL REFERENCES public.receipt_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (receipt_item_id, user_id)
);

-- ============================================
-- 7. Settlements
-- ============================================
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 8. Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_receipt_items_expense ON public.receipt_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_item ON public.item_assignments(receipt_item_id);
CREATE INDEX IF NOT EXISTS idx_item_assignments_user ON public.item_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_expense ON public.settlements(expense_id);

-- ============================================
-- 9. Row Level Security (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Users: can read all users (for search), update own profile
CREATE POLICY "Users can read all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Groups: members can read their groups
CREATE POLICY "Members can read their groups" ON public.groups
    FOR SELECT USING (
        id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Authenticated users can create groups" ON public.groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members: members can see other members in their groups
CREATE POLICY "Members can see group members" ON public.group_members
    FOR SELECT USING (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can insert group members" ON public.group_members
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.group_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR user_id = auth.uid()  -- Users can add themselves (for accepting invites)
    );

CREATE POLICY "Admins can delete group members" ON public.group_members
    FOR DELETE USING (
        group_id IN (
            SELECT group_id FROM public.group_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR user_id = auth.uid()  -- Users can remove themselves
    );

-- Expenses: group members can read/write
CREATE POLICY "Group members can read expenses" ON public.expenses
    FOR SELECT USING (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Group members can create expenses" ON public.expenses
    FOR INSERT WITH CHECK (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

-- Receipt Items: accessible if user can see the expense
CREATE POLICY "Group members can read receipt items" ON public.receipt_items
    FOR SELECT USING (
        expense_id IN (
            SELECT id FROM public.expenses WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Group members can create receipt items" ON public.receipt_items
    FOR INSERT WITH CHECK (
        expense_id IN (
            SELECT id FROM public.expenses WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
    );

-- Item Assignments: accessible if user can see the receipt item
CREATE POLICY "Group members can read assignments" ON public.item_assignments
    FOR SELECT USING (
        receipt_item_id IN (
            SELECT id FROM public.receipt_items WHERE expense_id IN (
                SELECT id FROM public.expenses WHERE group_id IN (
                    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Group members can create assignments" ON public.item_assignments
    FOR INSERT WITH CHECK (
        receipt_item_id IN (
            SELECT id FROM public.receipt_items WHERE expense_id IN (
                SELECT id FROM public.expenses WHERE group_id IN (
                    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Group members can delete assignments" ON public.item_assignments
    FOR DELETE USING (
        receipt_item_id IN (
            SELECT id FROM public.receipt_items WHERE expense_id IN (
                SELECT id FROM public.expenses WHERE group_id IN (
                    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
                )
            )
        )
    );

-- Settlements: accessible if involved
CREATE POLICY "Involved users can read settlements" ON public.settlements
    FOR SELECT USING (
        from_user_id = auth.uid() OR to_user_id = auth.uid()
    );

CREATE POLICY "Group members can create settlements" ON public.settlements
    FOR INSERT WITH CHECK (
        expense_id IN (
            SELECT id FROM public.expenses WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Involved users can update settlements" ON public.settlements
    FOR UPDATE USING (
        from_user_id = auth.uid() OR to_user_id = auth.uid()
    );
