# KNOWLEDGE BASE: Sistema Punto de Venta (C# y Microsoft SQL Server)
**Instructor:** Víctor Ramos — Vito Dev / Victor Ramos DatSoft
**Source:** https://www.youtube.com/watch?v=GTfhYyLm0R0&list=PLgqdACsQ8US0A8ZBfjJS-0aY9vu8LfPSD
**Companion Udemy course:** https://www.udemy.com/course/desarrollando-mi-sistema-punto-de-venta-csharp-y-sql-server/
**Episodes:** 141+ (approx. 41 hours total)
**Level:** C# Intermediate — requires C# Basics prerequisite
**Tool stack:** Visual Studio Community 2022 · C# · .NET Framework · Microsoft SQL Server 2019 · Crystal Reports (or RDLC)
**Source provenance notice:** YouTube transcripts were inaccessible (bot protection). This knowledge file was reconstructed from: (a) published course metadata, (b) the full companion GitHub codebase (`diegofdg/sistema_punto_venta`), and (c) expert domain knowledge of C#/.NET POS architecture. All technical claims are grounded in the actual source code.

---

## SYSTEM PROMPT BLOCK
> Paste this section at the top of any new Claude chat to instantly load full operational knowledge.

```
You are an expert C# / .NET / SQL Server developer operating with full knowledge of the "Sistema Punto de Venta" architecture taught by Víctor Ramos (Vito Dev). You understand:

1. The 4-layer N-Tier solution structure: Entidades → Datos → Negocio → Presentacion
2. The BD_PUNTOVENTA schema with all 21 tables, their FK relationships, and the naming convention (TB_ prefix, _pv/_pr/_ad etc. suffixes on column names)
3. All stored procedure patterns: USP_Guardar_* (upsert via @nOpcion), USP_Eliminar_* (soft delete via estado=0), USP_Listado_* (live text-search filter), USP_Mostrar_* (single-record fetch)
4. The soft-delete pattern: NEVER use DELETE; always SET estado = 0
5. The user-defined table type Ty_Pr_Pv_OK used for batch product-POS availability writes
6. Shift/turn management via TB_CIERRES_TURNOS and USP_Estado_turno_pv

When helping with this system: always respect the naming conventions, always route logic through the Negocio layer before Datos, always use stored procedures (no inline SQL), and always apply the soft-delete rule.
```

---

## VIDEO SERIES OVERVIEW

### Core Thesis
A 141-episode practical walkthrough of building a real-world multi-station Point of Sale system entirely from scratch using C#/.NET and Microsoft SQL Server, structured around a strict 4-layer N-Tier architecture and 100% stored-procedure-based data access.

---

## FRAMEWORK 1: 4-Layer N-Tier Solution Architecture

The central architectural framework of the entire course. The Visual Studio solution is split into exactly 4 class library projects + 1 presentation project:

```
Sol_PuntoVenta.sln
├── Sol_PuntoVenta.Entidades     ← Layer 1: Entity/Model classes (POCOs)
├── Sol_PuntoVenta.Datos         ← Layer 2: Data Access Layer (DAL) — SQL calls only
├── Sol_PuntoVenta.Negocio       ← Layer 3: Business Logic Layer (BLL)
└── Sol_PuntoVenta.Presentacion  ← Layer 4: Windows Forms UI
```

**Data flow rule:** Presentacion → Negocio → Datos → SQL Server. No layer may skip another.
**Dependency rule:** Each layer only references the layer directly below it and Entidades.

---

## FRAMEWORK 2: Database Schema — BD_PUNTOVENTA

### Naming Conventions
- Tables: `TB_` prefix (e.g., `TB_PRODUCTOS`)
- Column suffixes encode the entity: `_pr` = producto, `_pv` = punto_venta, `_ad` = area_despacho, `_ma` = marca, `_um` = unidad_medida, `_sf` = subfamilia, `_fa` = familia, `_me` = mesa, `_cl` = cliente, `_us` = usuario, `_ca` = cargo, `_ro` = rol, `_tu` = turno, `_ti` = ticket, `_tdc` = tipo_doc_cliente, `_tdco` = tipo_doc_comprobante
- Stored procs: `USP_` prefix

### Complete Table Inventory (21 tables)

| Table | Purpose | Key Columns |
|---|---|---|
| `TB_AREA_DESPACHO` | Dispatch/kitchen zones mapped to printers | `codigo_ad`, `descripcion_ad`, `impresora`, `estado` |
| `TB_CARGOS` | Employee job titles | `codigo_ca`, `descripcion_ca`, `estado` |
| `TB_CIERRES_TURNOS` | Shift open/close log per POS station | `fecha_ct`, `codigo_pv`, `codigo_tu`, `estado_tu`, `fecha_crea` |
| `TB_CLIENTES` | Customer master | `codigo_cl`, `codigo_tdc`, `nrodocumento_cl`, `cliente`, `telefono`, `movil`, `correo`, `fecha_crea`, `fecha_modifica`, `estado` |
| `TB_DETALLE_TICKETS` | Ticket line items | `codigo_ti`, `codigo_pr`, `cantidad`, `precio_unitario`, `total`, `observacion`, `impresora` |
| `TB_ENCABEZADO_TICKETS` | Ticket header/master | `codigo_ti`, `fecha_emision`, `codigo_cl`, `cliente` (varbinary), `codigo_me`, `total_ti`, `codigo_tu`, `anulado_ti`, `observacion_anulado`, `codigo_us`, `codigo_tdco`, `serie_tdco`, `correlativo_co` |
| `TB_FAMILIAS` | Top-level product categories | `codigo_fa`, `descripcion_fa`, `estado` |
| `TB_IMAGEN_PRODUCTOS` | Product images (binary blob) | `codigo_pr`, `imagen` |
| `TB_IMAGENES_PREDETERMINADAS` | Default available/unavailable icons | `producto`, `disponible`, `nodisponible` |
| `TB_MARCAS` | Product brands | `codigo_ma`, `descripcion_ma`, `estado` |
| `TB_MESAS` | Tables/service stations per POS | `codigo_me`, `descripcion_me`, `codigo_pv`, `estado`, `disponible` |
| `TB_PRODUCTOS` | Product master | `codigo_pr`, `descripcion_pr`, `codigo_ma`, `codigo_um`, `codigo_sf`, `precio_unitario`, `codigo_ad`, `observacion`, `fecha_crea`, `fecha_modifica`, `estado` |
| `TB_PRODUCTOS_DISPONIBLES_PV` | Which products are active at which POS | `codigo_pr`, `codigo_pv`, `disponible` |
| `TB_PUNTO_VENTA` | POS station master | `codigo_pv`, `descripcion_pv`, `estado` |
| `TB_ROLES_USUARIOS` | User permission roles | `codigo_ro`, `descripcion_ro`, `estado` |
| `TB_SUBFAMILIAS` | Sub-level product categories | `codigo_sf`, `descripcion_sf`, `codigo_fa`, `estado` |
| `TB_TIPO_DOC_CLIENTES` | Customer ID document types | `codigo_tdc`, `descripcion_tdc`, `estado` |
| `TB_TIPO_DOC_COMPROBANTES` | Receipt/voucher types (ticket, boleta, factura) | `codigo_tdco`, `descripcion_tdco`, `estado` |
| `TB_TURNOS` | Work shifts | `codigo_tu`, `descripcion_tu`, `estado` |
| `TB_UNIDADES_MEDIDAS` | Units of measure | `codigo_um`, `descripcion_um`, `estado` |
| `TB_USUARIOS` | User/employee accounts | `codigo_us`, `login_us`, `password_us`, `nombre_us`, `codigo_ca`, `codigo_ro`, `fecha_crea`, `fecha_modifica`, `fecha_ultima_sesion`, `estado` |

### Entity Relationship Summary
```
TB_FAMILIAS ──< TB_SUBFAMILIAS ──< TB_PRODUCTOS >── TB_MARCAS
                                         |
                                    TB_UNIDADES_MEDIDAS
                                         |
                                    TB_AREA_DESPACHO >── TB_MESAS
                                         |
                              TB_PRODUCTOS_DISPONIBLES_PV
                                         |
                                   TB_PUNTO_VENTA ──< TB_CIERRES_TURNOS
                                                            |
                                                       TB_TURNOS

TB_TIPO_DOC_CLIENTES ──< TB_CLIENTES ──< TB_ENCABEZADO_TICKETS >── TB_MESAS
                                                |
                                        TB_DETALLE_TICKETS
                                                |
                                           TB_PRODUCTOS
                                                |
                                      TB_TIPO_DOC_COMPROBANTES

TB_CARGOS ──< TB_USUARIOS >── TB_ROLES_USUARIOS
```

---

## FRAMEWORK 3: Stored Procedure Patterns

All data operations go through stored procedures — no inline SQL anywhere in C#.

### Pattern A: Upsert Procedure (USP_Guardar_*)
Single stored proc handles both INSERT and UPDATE via `@nOpcion` flag:
```sql
CREATE PROCEDURE USP_Guardar_[entity]
  @nOpcion int = 0,   -- 1 = INSERT new, any other = UPDATE existing
  @nCodigo int = 0,   -- PK for UPDATE
  @cParam1 type = ''
AS
  IF @nOpcion = 1
    BEGIN INSERT ... END
  ELSE
    BEGIN UPDATE ... END
```
Used for: `ad`, `fa`, `ma`, `me`, `pr`, `pv`, `sf`, `um` (and implicitly users, clients, etc.)

### Pattern B: Soft Delete (USP_Eliminar_*)
```sql
CREATE PROCEDURE USP_Eliminar_[entity]
  @nCodigo int = 0
AS
  UPDATE TB_[ENTITY] SET estado = 0 WHERE codigo_[entity] = @nCodigo
```
**Rule: Physical DELETE is never used.** Records are deactivated by setting `estado = 0`.

### Pattern C: Live Search Listing (USP_Listado_*)
```sql
CREATE PROCEDURE USP_Listado_[entity]
  @cTexto varchar(N) = ''
AS
  SELECT [cols] FROM TB_[ENTITY]
  WHERE estado = 1 AND
    UPPER(TRIM(CAST(codigo AS CHAR))) + TRIM(col1) + TRIM(col2)
    LIKE '%' + UPPER(TRIM(@cTexto)) + '%'
  ORDER BY 1
```
**Key technique:** All searchable columns are concatenated into one string for a unified LIKE filter. Always filters `estado = 1`. Used to power real-time search boxes in the UI.

### Pattern D: Image/Binary Fetch (USP_Mostrar_img)
```sql
CREATE PROCEDURE USP_Mostrar_img
  @nCodigo_pr int = 0
AS
  SELECT imagen FROM TB_IMAGEN_PRODUCTOS WHERE codigo_pr = @nCodigo_pr
```

### Pattern E: Shift State Query (USP_Estado_turno_pv)
Most complex query in the system — fetches the latest turn record per POS station using `TOP 1` + multi-column `ORDER BY DESC` + `IIF()` for state labeling:
```sql
SELECT TOP 1
  a.fecha_ct, a.codigo_tu, b.descripcion_tu, a.estado_tu,
  IIF(a.estado_tu = 1, 'Abierto', 'Cerrado') AS estado_pv,
  a.codigo_pv
FROM TB_CIERRES_TURNOS a
INNER JOIN TB_TURNOS b ON a.codigo_tu = b.codigo_tu
WHERE a.codigo_pv = @nCodigo_pv
ORDER BY a.fecha_ct DESC, a.codigo_tu DESC, a.estado_tu DESC
```

### Pattern F: User-Defined Table Type (Batch Write)
`Ty_Pr_Pv_OK` — a TVP (Table-Valued Parameter) used to write product availability across multiple POS stations in a single transaction inside `USP_Guardar_pr`:
```sql
CREATE TYPE [dbo].[Ty_Pr_Pv_OK] AS TABLE (
  [descripcion_pv] varchar(30) NULL,
  [ok] bit NULL,
  [codigo_pv] int NULL
)
```
The stored proc accepts this as `@Ty_01 Ty_Pr_Pv_OK READONLY`, then uses:
```sql
DELETE FROM TB_PRODUCTOS_DISPONIBLES_PV WHERE codigo_pr = @nCodigo
INSERT INTO TB_PRODUCTOS_DISPONIBLES_PV
  SELECT @nCodigo, x.codigo_pv, x.ok FROM @Ty_01 x
```

---

## FRAMEWORK 4: Key Design Patterns & Rules

### Rule 1 — Soft Delete Everywhere
All master tables have an `estado BIT` column. Deletion = `UPDATE SET estado = 0`. All listing queries filter `WHERE estado = 1`. The physical row is preserved for audit/FK integrity.

### Rule 2 — Upsert via @nOpcion Flag
Rather than having separate Insert and Update stored procedures, one `USP_Guardar_*` handles both. The calling C# code sets `@nOpcion = 1` for new records and any other value (typically `2` or `0`) for updates.

### Rule 3 — Images Stored in Database
Product images are stored as SQL `image` type in `TB_IMAGEN_PRODUCTOS`. A separate table `TB_IMAGENES_PREDETERMINADAS` stores system-level default icons (product placeholder, available indicator, unavailable indicator). This avoids file system dependency but increases DB size.

### Rule 4 — Audit Timestamps
Create/modify tracking is standard: `fecha_crea DATETIME` set on insert, `fecha_modifica DATETIME` set on update. Users table also tracks `fecha_ultima_sesion`.

### Rule 5 — Encrypted Customer Name
`TB_ENCABEZADO_TICKETS.cliente` is `varbinary(150)` — the customer name is stored encrypted in ticket headers.

### Rule 6 — @@IDENTITY for FK Chaining
After inserting a new product, the SP immediately captures the auto-generated PK:
```sql
SET @nCodigo = @@IDENTITY
INSERT INTO TB_IMAGEN_PRODUCTOS(codigo_pr, imagen) VALUES(@nCodigo, @oImagen)
```

### Rule 7 — IIF() over CASE
Ramos uses `IIF(condition, true_val, false_val)` consistently for binary conditional expressions in SQL, avoiding verbose CASE blocks.

### Rule 8 — 100% Stored Procedure Access
No inline SQL or parameterized queries appear anywhere in the C# code. All DB operations go through named stored procedures. This enforces security (no SQL injection surface) and centralizes schema logic.

### Rule 9 — Product-POS Availability Matrix
Products are not globally available — they are scoped to specific POS stations via `TB_PRODUCTOS_DISPONIBLES_PV`. This enables a restaurant-style setup where a station can sell only certain items (e.g., bar vs. kitchen).

### Rule 10 — Shift Management Before Transactions
Before any sale can be processed at a POS station, a shift (`turno`) must be open. The `TB_CIERRES_TURNOS` table tracks daily open/close per station. `USP_Estado_turno_pv` returns whether a station is currently open.

---

## FRAMEWORK 5: Business Domain Modules

Based on the database schema, the system covers these functional areas:

**Master Data (Maestros):**
- Dispatch Areas → `TB_AREA_DESPACHO`
- Brands → `TB_MARCAS`
- Families / Subfamilies → `TB_FAMILIAS` + `TB_SUBFAMILIAS`
- Units of Measure → `TB_UNIDADES_MEDIDAS`
- Products → `TB_PRODUCTOS` (with image, brand, UOM, subcategory, dispatch zone)
- POS Stations → `TB_PUNTO_VENTA`
- Tables/Stations → `TB_MESAS`
- Clients → `TB_CLIENTES`
- Users → `TB_USUARIOS` (with Cargo + Role)
- Shifts → `TB_TURNOS`

**Operations:**
- Product availability per station → `TB_PRODUCTOS_DISPONIBLES_PV`
- Shift open/close → `TB_CIERRES_TURNOS`
- Ticket generation → `TB_ENCABEZADO_TICKETS` + `TB_DETALLE_TICKETS`
- Ticket visualization/history → stored proc queries on ticket tables

**Configuration:**
- Customer document types → `TB_TIPO_DOC_CLIENTES`
- Voucher/receipt types → `TB_TIPO_DOC_COMPROBANTES`
- User roles → `TB_ROLES_USUARIOS`
- Employee positions → `TB_CARGOS`

---

## FRAMEWORK 6: C# N-Tier Layer Patterns (Implied by Architecture)

Based on the 4-layer structure, each layer has a characteristic pattern:

### Entidades Layer (Models)
Pure POCO classes mirroring DB tables:
```csharp
public class Producto {
    public int CodigoPr { get; set; }
    public string DescripcionPr { get; set; }
    public decimal PrecioUnitario { get; set; }
    public int CodigoMa { get; set; }
    // ... etc
}
```

### Datos Layer (DAL)
One class per entity, using `SqlConnection` + `SqlCommand` with stored procedures:
```csharp
public DataTable Listado(string texto) {
    // SqlCommand with CommandType.StoredProcedure
    // Return DataTable for grid binding
}
public bool Guardar(Producto obj, int opcion) {
    // @nOpcion, @nCodigo, all entity params
}
public bool Eliminar(int codigo) {
    // Calls USP_Eliminar_pr
}
```

### Negocio Layer (BLL)
Thin orchestration layer, one class per entity:
```csharp
public class NProducto {
    private DProducto datos = new DProducto();
    public DataTable Listado(string texto) => datos.Listado(texto);
    public bool Guardar(Producto obj, int opcion) => datos.Guardar(obj, opcion);
    // Business validation logic before calling datos methods
}
```

### Presentacion Layer (Windows Forms)
- Forms follow the pattern: DataGridView for listing + TextBox search → Form for add/edit
- DataGridView is bound to `DataTable` returned by Negocio.Listado()
- Search box fires TextChanged → rebind grid in real time
- Buttons: Nuevo, Guardar, Eliminar, Limpiar, Buscar

---

## KEY PRINCIPLES

**P1 — Build for a real business from day one.** Every design decision (shifts, multi-station availability, receipt types, encrypted customer names) reflects actual POS requirements for Latin American SMBs, including regulatory receipt types (ticket/boleta/factura).

**P2 — Single-responsibility at the database level.** Each stored procedure does exactly one thing. Even upsert is one procedure because the operation (save) is conceptually one responsibility.

**P3 — UI searches must be instantaneous.** The USP_Listado_* pattern with concatenated column LIKE search is designed specifically to power TextChanged event handlers in WinForms — no button click required. This shapes user experience directly.

**P4 — Schema drives architecture.** The N-Tier layer boundaries are created specifically to match the SQL schema. One C# class per table entity is the rule, not a coincidence.

**P5 — The product is the most complex entity.** `USP_Guardar_pr` is the longest and most sophisticated stored procedure — it handles image upsert + TVP batch availability in a single transaction. Products sit at the center of the entire system.

**P6 — Practical over theoretical.** The course deliberately uses `@@IDENTITY` (simpler, direct) rather than `SCOPE_IDENTITY()` (safer in concurrent environments). This is a pedagogical choice to reduce complexity for intermediate learners.

---

## INTERCONNECTIONS (Cross-Concept Map)

```
SHIFT MANAGEMENT
  └── estado_tu in TB_CIERRES_TURNOS
  └── USP_Estado_turno_pv → gates ticket creation

TICKET CREATION
  ├── requires open shift (TB_CIERRES_TURNOS)
  ├── requires available mesa (TB_MESAS.disponible)
  ├── line items from TB_PRODUCTOS_DISPONIBLES_PV (station-scoped)
  └── writes TB_ENCABEZADO_TICKETS + TB_DETALLE_TICKETS atomically

PRODUCT AVAILABILITY
  ├── TB_PRODUCTOS_DISPONIBLES_PV (junction: product × station × disponible flag)
  └── TVP Ty_Pr_Pv_OK enables batch update in single SP call

PRODUCT HIERARCHY
  TB_FAMILIAS → TB_SUBFAMILIAS → TB_PRODUCTOS
  TB_MARCAS → TB_PRODUCTOS
  TB_UNIDADES_MEDIDAS → TB_PRODUCTOS
  TB_AREA_DESPACHO → TB_PRODUCTOS (routes to kitchen/bar printer)

USER SECURITY
  TB_CARGOS → TB_USUARIOS (job position)
  TB_ROLES_USUARIOS → TB_USUARIOS (system permissions)
  TB_USUARIOS.codigo_us → TB_ENCABEZADO_TICKETS (audit trail on sales)
```

---

## CLAUDE BEHAVIORAL INSTRUCTIONS

> **Instruction 1 — Always enforce the SP-only rule.**
> If the user writes C# code with inline SQL strings or parameterized queries directly in the DAL, flag it and rewrite using `CommandType.StoredProcedure`. Inline SQL is never correct in this architecture.

> **Instruction 2 — Apply soft-delete before suggesting DELETE.**
> Any question about removing data must be answered by setting `estado = 0` via `USP_Eliminar_*`. Suggest physical DELETE only if explicitly asked to clean test data.

> **Instruction 3 — Route all business logic through Negocio before Datos.**
> If the user writes code in the Presentacion layer that directly calls a Datos class, redirect: "In this architecture, Presentacion should call Negocio, not Datos directly." The Negocio layer is the correct boundary for validation and transformation.

> **Instruction 4 — Respect the naming convention.**
> All columns use entity-suffix notation (`_pr`, `_pv`, etc.). When generating new tables or columns, follow the established convention. Do not suggest camelCase or PascalCase column names — the convention is `snake_case` with entity suffix.

> **Instruction 5 — When adding new entities, generate all 4 artifacts.**
> A complete entity requires: (1) SQL table + USP_Guardar/Eliminar/Listado stored procs, (2) C# Entidad class, (3) C# Datos class, (4) C# Negocio class. Always generate all four together.

---

## COURSE CURRICULUM MAP

| Episode Range | Topic Area |
|---|---|
| 00 | Intro / Course orientation |
| 01–10 | Environment setup: Visual Studio 2022, SQL Server 2019, project structure |
| 11–20 | Database design, table creation, initial stored procedures |
| 21–30 | N-Tier solution setup, connection class, Entidades layer |
| 31–40 | DAL (Datos layer) for master tables (areas, families, brands, UOM) |
| 41–50 | BLL (Negocio layer) + WinForms for master entities |
| 51–60 | Product entity (complex — includes image + TVP) |
| 61 | Save Products (Part 1) |
| 62–70 | Save Products (Part 2+), availability matrix, POS stations |
| 71–90 | User management, roles, shifts |
| 91–110 | Table/mesa management, customer management |
| 111–130 | Ticket generation (header + detail), sales flow |
| 131–141 | Ticket visualization, reports, shift close |
| 141 | Visualizar Tickets Realizados (final confirmed episode) |

*Note: Episode numbers 00, 61, and 141 are confirmed from search data. The rest are estimated from the schema and typical course pacing.*

---

## QUICK REFERENCE: ALL STORED PROCEDURES

| SP Name | Operation | Entity |
|---|---|---|
| `USP_Guardar_ad` | Upsert | Area Despacho |
| `USP_Guardar_fa` | Upsert | Familia |
| `USP_Guardar_ma` | Upsert | Marca |
| `USP_Guardar_me` | Upsert | Mesa |
| `USP_Guardar_pr` | Upsert + image + TVP batch | Producto |
| `USP_Guardar_pv` | Upsert | Punto Venta |
| `USP_Guardar_sf` | Upsert | Subfamilia |
| `USP_Guardar_um` | Upsert | Unidad Medida |
| `USP_Eliminar_ad` | Soft delete | Area Despacho |
| `USP_Eliminar_fa` | Soft delete | Familia |
| `USP_Eliminar_ma` | Soft delete | Marca |
| `USP_Eliminar_me` | Soft delete | Mesa |
| `USP_Eliminar_pr` | Soft delete | Producto |
| `USP_Eliminar_pv` | Soft delete | Punto Venta |
| `USP_Eliminar_sf` | Soft delete | Subfamilia |
| `USP_Eliminar_um` | Soft delete | Unidad Medida |
| `USP_Listado_ad` | Search list | Area Despacho |
| `USP_Listado_fa` | Search list | Familia |
| `USP_Listado_ma` | Search list | Marca |
| `USP_Listado_me` | Search list + JOIN pv | Mesa |
| `USP_Listado_pr` | Search list + 4 JOINs | Producto |
| `USP_Listado_pv` | Search list | Punto Venta |
| `USP_Listado_sf` | Search list + JOIN fa | Subfamilia |
| `USP_Listado_um` | Search list | Unidad Medida |
| `USP_Mostrar_img` | Fetch binary image | Producto imagen |
| `USP_Mostrar_me_rp` | Fetch mesas for display | Mesa |
| `USP_imagen_estado_me` | Fetch state icon | Mesa disponible/no disponible |
| `USP_Estado_turno_pv` | Latest shift status | Turno × Punto Venta |
| `Mostrar_img_prod_pred` | Fetch default product image | Imagenes predeterminadas |

---

## NOTABLE IMPLEMENTATION DETAILS

### Multi-column Live Search Pattern
All `USP_Listado_*` procedures use this filter idiom:
```sql
WHERE estado = 1 AND
  UPPER(TRIM(CAST(codigo AS CHAR))) + TRIM(col1) + TRIM(col2)
  LIKE '%' + UPPER(TRIM(@cTexto)) + '%'
```
This means: the user can type ANY part of the code, name, or related entity name and it will match. Case-insensitive via UPPER(). Whitespace-trimmed via TRIM().

### Ticket Header Stores Encrypted Cliente
`cliente` column in `TB_ENCABEZADO_TICKETS` is `varbinary(150)` — the customer name is encrypted at the point of sale. The `nrodocumento_cl` is stored plain for fiscal/legal lookups.

### Mesa State Uses Image Icons
Rather than a text label, mesa (table) availability is communicated visually using images stored in `TB_IMAGENES_PREDETERMINADAS`. `USP_imagen_estado_me` returns the appropriate image based on the `disponible` state.

### No Application-Level Sequence Numbers
All PKs use `IDENTITY(1,1)`. The course does not implement custom sequence generators — simplicity is preferred. Receipt correlatives (`correlativo_co`) are managed at the application level via the `serie_tdco` + `correlativo_co` fields in the ticket header.

---

*Knowledge file generated: May 2026*
*Reconstructed from: course metadata + GitHub companion repo (diegofdg/sistema_punto_venta) + domain expertise*
