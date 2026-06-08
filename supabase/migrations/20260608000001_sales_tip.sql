-- =====================================================================
-- Migration: propinas en ventas (sales.tip)
-- =====================================================================
-- Las barberías mexicanas cobran propina en el POS. La propina va 100% al
-- barbero y NO forma parte de la base de comisión ni del subtotal.
--   total = (subtotal - discount) + tip
-- La comisión se calcula sobre (subtotal - discount); la propina se entrega
-- íntegra al barbero por separado.
-- =====================================================================

alter table public.sales
  add column tip decimal(10,2) not null default 0;

alter table public.sales
  add constraint sales_tip_nonnegative check (tip >= 0);

comment on column public.sales.tip is
  'Propina. Va 100% al barbero, fuera de la base de comisión. total = (subtotal - discount) + tip.';
