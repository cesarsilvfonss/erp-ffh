import { prisma } from "./prisma";
import { getOpenPeriod } from "./closure";
import { formatDatePY, startOfDayPY, endOfDayPY, todayPY, diffDaysYmd } from "./dates";
import { getTotalRetentionBalance, loadDistributionInputs } from "./distribution";
import { computeDistribution } from "./shareholders";

const fmtGs = (n: number) => `Gs. ${Math.round(n || 0).toLocaleString("es-PY")}`;
const fmtKg = (n: number) => `${Number(n || 0).toLocaleString("es-PY", { maximumFractionDigits: 2 })} kg`;

// ============================================================================
// 1. RESUMEN GENERAL Y CAPITAL EN TIEMPO REAL
// ============================================================================
export async function obtenerResumenGeneralYCapital() {
  const { start, previousCapital, startYmd, lastClosure } = await getOpenPeriod();
  const todayStr = todayPY();
  const daysOfPeriod = Math.max(1, diffDaysYmd(startYmd, todayStr));

  const [
    salesAgg,
    expensesAgg,
    purchasesAgg,
    bankAccounts,
    inventoryLots,
    walletChecksRecords,
    receivablesRecords,
    payablesRecords,
    liveStockClosures,
    retentionBalance,
    distInputs,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { date: { gte: start }, status: { not: "CANCELLED" } },
      _sum: { totalValue: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: start } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.batchClosure.aggregate({
      where: { batch: { date: { gte: start } } },
      _sum: { totalValue: true },
      _count: { id: true },
    }),
    prisma.bankAccount.findMany({ include: { transactions: true, currency: true } }),
    prisma.inventoryLot.findMany({ where: { currentStock: { gte: 0.2 } } }),
    prisma.check.findMany({ where: { status: "IN_PORTFOLIO" } }),
    prisma.accountReceivable.findMany({ where: { status: { not: "PAID" } } }),
    prisma.accountPayable.findMany({ where: { status: { not: "PAID" } } }),
    prisma.batchClosure.findMany({
      where: {
        batch: {
          inventoryLots: { none: { unitCost: { gt: 0 } } },
          isLiveSale: false,
        },
      },
    }),
    getTotalRetentionBalance(),
    loadDistributionInputs(),
  ]);

  const bankBalance = bankAccounts.reduce((acc, account) => {
    const txSum = account.transactions.reduce(
      (sum, tx) => (tx.type === "INCOME" ? sum + tx.amount : sum - tx.amount),
      0
    );
    return acc + account.initialBalance + txSum;
  }, 0);

  const inventoryValue = inventoryLots.reduce((acc, lot) => acc + lot.currentStock * lot.unitCost, 0);
  const totalKgCamara = inventoryLots.reduce((acc, lot) => acc + lot.currentStock, 0);
  const walletChecks = walletChecksRecords.reduce((acc, check) => acc + check.amount, 0);
  const receivables = receivablesRecords.reduce((acc, rec) => acc + (rec.amount - rec.paidAmount), 0);
  const payables = payablesRecords.reduce((acc, pay) => acc + (pay.amount - pay.paidAmount), 0);
  const liveStockValue = liveStockClosures.reduce((acc, c) => acc + c.totalValue, 0);

  const currentTotalCapital =
    bankBalance + walletChecks + receivables + inventoryValue + liveStockValue - payables - retentionBalance;
  const capitalVariation = currentTotalCapital - previousCapital;
  const growthPercentage = previousCapital > 0 ? (capitalVariation / previousCapital) * 100 : 0;
  const monthlyGrowth = (growthPercentage / daysOfPeriod) * 30;

  const dist = computeDistribution(distInputs.shareholders, distInputs.participants, capitalVariation);

  return {
    periodoAbierto: {
      fechaInicio: formatDatePY(startOfDayPY(startYmd)),
      fechaActual: formatDatePY(startOfDayPY(todayStr)),
      diasTranscurridos: daysOfPeriod,
      ultimoCierre: lastClosure ? formatDatePY(lastClosure.periodEnd) : "Sin cierres previos (Ejercicio inicial)",
    },
    activosYComponentesCapital: {
      saldoBancarioTotal: fmtGs(bankBalance),
      stockEnCamaraValor: fmtGs(inventoryValue),
      stockEnCamaraKilos: fmtKg(totalKgCamara),
      stockEnPieValor: fmtGs(liveStockValue),
      chequesEnCartera: fmtGs(walletChecks),
      cantidadChequesEnCartera: walletChecksRecords.length,
      cuentasPorCobrarClientes: fmtGs(receivables),
      cuentasPorPagarProveedores: fmtGs(payables),
      retencionParticipantesDeuda: fmtGs(retentionBalance),
    },
    analisisDeCapitalYUtilidad: {
      capitalInicialDelPeriodo: fmtGs(previousCapital),
      capitalTotalActual: fmtGs(currentTotalCapital),
      utilidadBrutaDelPeriodo: fmtGs(capitalVariation),
      crecimientoDelPeriodoPorcentaje: `${growthPercentage.toFixed(2)}%`,
      proyeccionMensualPorcentaje: `${monthlyGrowth.toFixed(2)}%`,
    },
    operacionesDelPeriodoAbierto: {
      ventasTotales: fmtGs(salesAgg._sum.totalValue || 0),
      cantidadVentas: salesAgg._count.id,
      comprasDeHacienda: fmtGs(purchasesAgg._sum.totalValue || 0),
      cantidadLotesCerrados: purchasesAgg._count.id,
      gastosTotales: fmtGs(expensesAgg._sum.amount || 0),
      cantidadGastos: expensesAgg._count.id,
    },
    distribucionEstimadaAlHoy: {
      participantes: dist.participants.map((p) => ({
        nombre: p.name,
        porcentajeSobreUtilidad: `${p.profitShare}%`,
        totalCorrespondiente: fmtGs(p.amount),
        aSalario: fmtGs(p.salary),
        aRetencion: fmtGs(p.retained),
        saldoRetencionActual: fmtGs(p.retentionBefore),
      })),
      accionistas: dist.shareholders.map((s) => ({
        nombre: s.name,
        capitalInicial: fmtGs(s.initialCapital),
        participacionCapital: `${s.participation.toFixed(2)}%`,
        utilidadAsignada: fmtGs(s.profitAmount),
        capitalFinalEstimado: fmtGs(s.finalCapital),
      })),
    },
  };
}

// ============================================================================
// 2. SALDOS BANCARIOS Y MOVIMIENTOS
// ============================================================================
export async function consultarSaldosBancarios(args?: {
  incluirUltimosMovimientos?: boolean;
  limiteMovimientos?: number;
}) {
  const incluir = args?.incluirUltimosMovimientos ?? true;
  const limite = Math.min(Math.max(args?.limiteMovimientos || 10, 1), 30);

  const accounts = await prisma.bankAccount.findMany({
    include: {
      currency: true,
      transactions: {
        orderBy: { date: "desc" },
      },
    },
  });

  let totalGeneral = 0;

  const detalleCuentas = accounts.map((acc) => {
    const txSum = acc.transactions.reduce(
      (sum, tx) => (tx.type === "INCOME" ? sum + tx.amount : sum - tx.amount),
      0
    );
    const currentBalance = acc.initialBalance + txSum;
    totalGeneral += currentBalance;

    return {
      banco: acc.bankName,
      nombreCuenta: acc.accountName,
      numeroCuenta: acc.accountNumber,
      moneda: acc.currency?.code || "PYG",
      activa: acc.status,
      saldoActual: fmtGs(currentBalance),
      saldoNumerico: currentBalance,
      ultimosMovimientos: incluir
        ? acc.transactions.slice(0, limite).map((tx) => ({
            fecha: formatDatePY(tx.date),
            tipo: tx.type === "INCOME" ? "INGRESO" : tx.type === "EXPENSE" ? "EGRESO" : "TRANSFERENCIA",
            monto: fmtGs(tx.amount),
            concepto: tx.concept,
            referencia: tx.reference || "-",
          }))
        : undefined,
    };
  });

  return {
    saldoTotalEnBancos: fmtGs(totalGeneral),
    cantidadCuentas: accounts.length,
    cuentas: detalleCuentas,
  };
}

// ============================================================================
// 3. CUENTAS POR COBRAR (CLIENTES QUE NOS DEBEN)
// ============================================================================
export async function consultarCuentasPorCobrar(args?: {
  busquedaCliente?: string;
  incluirPagadas?: boolean;
}) {
  const search = args?.busquedaCliente?.trim();
  const incluirPagadas = args?.incluirPagadas ?? false;

  const receivables = await prisma.accountReceivable.findMany({
    where: {
      ...(incluirPagadas ? {} : { status: { not: "PAID" } }),
      ...(search
        ? {
            client: {
              OR: [
                { legalName: { contains: search, mode: "insensitive" } },
                { tradeName: { contains: search, mode: "insensitive" } },
                { ruc: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      client: true,
      sale: true,
      payments: {
        orderBy: { date: "desc" },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  let totalPendiente = 0;
  const porCliente: Record<
    string,
    {
      cliente: string;
      nombreComercial: string | null;
      ruc: string | null;
      telefono: string | null;
      saldoPendienteTotal: number;
      facturasPendientes: number;
      detalle: any[];
    }
  > = {};

  for (const r of receivables) {
    const saldo = r.amount - r.paidAmount;
    if (!incluirPagadas && saldo <= 1) continue;

    totalPendiente += Math.max(0, saldo);
    const key = r.clientId;
    if (!porCliente[key]) {
      porCliente[key] = {
        cliente: r.client.legalName,
        nombreComercial: r.client.tradeName,
        ruc: r.client.ruc,
        telefono: r.client.phone,
        saldoPendienteTotal: 0,
        facturasPendientes: 0,
        detalle: [],
      };
    }

    if (saldo > 1) {
      porCliente[key].saldoPendienteTotal += saldo;
      porCliente[key].facturasPendientes += 1;
    }

    porCliente[key].detalle.push({
      factura: r.sale?.invoiceNumber || "Sin N° factura",
      fechaVenta: r.sale ? formatDatePY(r.sale.date) : formatDatePY(r.createdAt),
      vencimiento: formatDatePY(r.dueDate),
      montoOriginal: fmtGs(r.amount),
      montoCobrado: fmtGs(r.paidAmount),
      saldoPendiente: fmtGs(saldo),
      estado: r.status === "PAID" ? "PAGADO" : r.status === "PARTIAL" ? "PARCIAL" : "PENDIENTE",
    });
  }

  const clientesOrdenados = Object.values(porCliente)
    .sort((a, b) => b.saldoPendienteTotal - a.saldoPendienteTotal)
    .map((c) => ({
      cliente: c.cliente,
      nombreComercial: c.nombreComercial || "-",
      rucExacto: c.ruc || "Sin RUC registrado",
      telefono: c.telefono || "-",
      facturasPendientes: c.facturasPendientes,
      deudaTotalCliente: fmtGs(c.saldoPendienteTotal),
      cuentas: c.detalle.slice(0, 15),
    }));

  return {
    totalGeneralPorCobrar: fmtGs(totalPendiente),
    cantidadClientesConDeuda: clientesOrdenados.length,
    clientes: clientesOrdenados,
  };
}

// ============================================================================
// 4. CUENTAS POR PAGAR (DEUDAS CON PROVEEDORES / GASTOS / PRÉSTAMOS)
// ============================================================================
export async function consultarCuentasPorPagar(args?: {
  busquedaProveedor?: string;
  incluirPagadas?: boolean;
}) {
  const search = args?.busquedaProveedor?.trim();
  const incluirPagadas = args?.incluirPagadas ?? false;

  const payables = await prisma.accountPayable.findMany({
    where: {
      ...(incluirPagadas ? {} : { status: { not: "PAID" } }),
      ...(search
        ? {
            provider: {
              OR: [
                { legalName: { contains: search, mode: "insensitive" } },
                { tradeName: { contains: search, mode: "insensitive" } },
                { ruc: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      provider: true,
      payments: { orderBy: { date: "desc" } },
    },
    orderBy: { dueDate: "asc" },
  });

  let totalPorPagar = 0;
  const porProveedor: Record<
    string,
    {
      proveedor: string;
      nombreComercial: string | null;
      ruc: string | null;
      telefono: string | null;
      saldoPendienteTotal: number;
      cuentasPendientes: number;
      detalle: any[];
    }
  > = {};

  for (const p of payables) {
    const saldo = p.amount - p.paidAmount;
    if (!incluirPagadas && saldo <= 1) continue;

    totalPorPagar += Math.max(0, saldo);
    const key = p.providerId;
    if (!porProveedor[key]) {
      porProveedor[key] = {
        proveedor: p.provider.legalName,
        nombreComercial: p.provider.tradeName,
        ruc: p.provider.ruc,
        telefono: p.provider.phone,
        saldoPendienteTotal: 0,
        cuentasPendientes: 0,
        detalle: [],
      };
    }

    if (saldo > 1) {
      porProveedor[key].saldoPendienteTotal += saldo;
      porProveedor[key].cuentasPendientes += 1;
    }

    porProveedor[key].detalle.push({
      origen:
        p.type === "BATCH_PURCHASE"
          ? "Compra de Hacienda (Lote)"
          : p.type === "EXPENSE"
          ? "Gasto Operativo"
          : "Préstamo",
      fechaRegistro: formatDatePY(p.createdAt),
      vencimiento: formatDatePY(p.dueDate),
      montoOriginal: fmtGs(p.amount),
      montoPagado: fmtGs(p.paidAmount),
      saldoPendiente: fmtGs(saldo),
      estado: p.status === "PAID" ? "PAGADO" : p.status === "PARTIAL" ? "PARCIAL" : "PENDIENTE",
    });
  }

  const proveedoresOrdenados = Object.values(porProveedor)
    .sort((a, b) => b.saldoPendienteTotal - a.saldoPendienteTotal)
    .map((p) => ({
      proveedor: p.proveedor,
      nombreComercial: p.nombreComercial || "-",
      rucExacto: p.ruc || "Sin RUC registrado",
      telefono: p.telefono || "-",
      cuentasPendientes: p.cuentasPendientes,
      deudaTotalConProveedor: fmtGs(p.saldoPendienteTotal),
      cuentas: p.detalle.slice(0, 15),
    }));

  return {
    totalGeneralPorPagar: fmtGs(totalPorPagar),
    cantidadProveedores: proveedoresOrdenados.length,
    proveedores: proveedoresOrdenados,
  };
}

// ============================================================================
// 5. CHEQUES EN CARTERA
// ============================================================================
export async function consultarChequesEnCartera(args?: {
  estado?: "IN_PORTFOLIO" | "DEPOSITED" | "REJECTED" | "TODOS";
}) {
  const estado = args?.estado || "IN_PORTFOLIO";

  const checks = await prisma.check.findMany({
    where: estado === "TODOS" ? {} : { status: estado },
    include: {
      payment: {
        include: {
          accountReceivable: {
            include: { client: true },
          },
        },
      },
      depositBank: true,
    },
    orderBy: { dueDate: "asc" },
    take: 40,
  });

  const totalMonto = checks.reduce((acc, c) => acc + c.amount, 0);

  return {
    filtroEstado:
      estado === "IN_PORTFOLIO"
        ? "EN CARTERA (Por depositar)"
        : estado === "DEPOSITED"
        ? "DEPOSITADOS"
        : estado === "REJECTED"
        ? "RECHAZADOS"
        : "TODOS",
    cantidadCheques: checks.length,
    montoTotal: fmtGs(totalMonto),
    cheques: checks.map((c) => ({
      numeroCheque: c.checkNumber,
      bancoEmisor: c.bankName,
      cliente: c.payment?.accountReceivable?.client?.legalName || "Desconocido",
      fechaEmision: formatDatePY(c.issueDate),
      fechaCobroVencimiento: formatDatePY(c.dueDate),
      monto: fmtGs(c.amount),
      estado:
        c.status === "IN_PORTFOLIO"
          ? "En Cartera"
          : c.status === "DEPOSITED"
          ? `Depositado (${c.depositBank?.bankName || ""})`
          : "Rechazado",
    })),
  };
}

// ============================================================================
// 6. INVENTARIO Y STOCK (CÁMARA Y EN PIE)
// ============================================================================
export async function consultarInventarioYStock() {
  const [inventoryLots, liveStockClosures] = await Promise.all([
    prisma.inventoryLot.findMany({
      where: { currentStock: { gte: 0.2 } },
      include: {
        item: true,
        batch: {
          include: { provider: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.batchClosure.findMany({
      where: {
        batch: {
          inventoryLots: { none: { unitCost: { gt: 0 } } },
          isLiveSale: false,
        },
      },
      include: {
        batch: {
          include: {
            provider: true,
            details: { include: { item: true } },
          },
        },
      },
    }),
  ]);

  let valorTotalCamara = 0;
  let kilosTotalesCamara = 0;

  const resumenPorArticulo: Record<
    string,
    { articulo: string; categoria: string; kilosTotales: number; valorTotal: number }
  > = {};

  const lotesEnCamara = inventoryLots.map((lot) => {
    const val = lot.currentStock * lot.unitCost;
    valorTotalCamara += val;
    kilosTotalesCamara += lot.currentStock;

    const itemKey = lot.item.name;
    if (!resumenPorArticulo[itemKey]) {
      resumenPorArticulo[itemKey] = {
        articulo: lot.item.name,
        categoria: lot.item.category,
        kilosTotales: 0,
        valorTotal: 0,
      };
    }
    resumenPorArticulo[itemKey].kilosTotales += lot.currentStock;
    resumenPorArticulo[itemKey].valorTotal += val;

    return {
      loteNumero: lot.batch ? `Lote #${lot.batch.batchNumber}` : "Ingreso Inicial",
      proveedor: lot.batch?.provider?.legalName || "-",
      articulo: lot.item.name,
      stockInicial: fmtKg(lot.initialStock),
      stockActual: fmtKg(lot.currentStock),
      costoPorKg: fmtGs(lot.unitCost),
      valorTotalLote: fmtGs(val),
    };
  });

  const valorTotalEnPie = liveStockClosures.reduce((acc, c) => acc + c.totalValue, 0);

  return {
    stockEnCamaraFrigorifica: {
      valorTotal: fmtGs(valorTotalCamara),
      kilosTotales: fmtKg(kilosTotalesCamara),
      cantidadLotesConStock: lotesEnCamara.length,
      resumenPorProducto: Object.values(resumenPorArticulo).map((r) => ({
        articulo: r.articulo,
        categoria: r.categoria,
        kilosDisponibles: fmtKg(r.kilosTotales),
        valorValorizado: fmtGs(r.valorTotal),
      })),
      detallePorLote: lotesEnCamara,
    },
    stockEnPieSinFaenar: {
      valorTotal: fmtGs(valorTotalEnPie),
      cantidadLotesEnPie: liveStockClosures.length,
      lotes: liveStockClosures.map((c) => ({
        loteNumero: `Lote #${c.batch.batchNumber}`,
        fechaCompra: formatDatePY(c.batch.date),
        proveedor: c.batch.provider.legalName,
        cabezas: c.totalHeads,
        pesoLiquidoTotal: fmtKg(c.totalLiquidWeight),
        valorTotalCompra: fmtGs(c.totalValue),
      })),
    },
  };
}

// ============================================================================
// 7. LOTES DE HACIENDA Y FAENAS
// ============================================================================
export async function consultarLotesYFaenas(args?: {
  numeroLote?: number;
  busquedaProveedor?: string;
  limite?: number;
}) {
  const limite = Math.min(Math.max(args?.limite || 10, 1), 25);
  const search = args?.busquedaProveedor?.trim();

  const batches = await prisma.batch.findMany({
    where: {
      ...(args?.numeroLote ? { batchNumber: args.numeroLote } : {}),
      ...(search
        ? {
            provider: {
              OR: [
                { legalName: { contains: search, mode: "insensitive" } },
                { tradeName: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      provider: true,
      slaughterhouse: true,
      details: { include: { item: true } },
      closure: { include: { prices: { include: { item: true } } } },
      slaughter: { include: { details: { include: { item: true } } } },
      expenses: { include: { category: true } },
      inventoryLots: {
        include: {
          saleDetails: {
            where: { sale: { status: { not: "CANCELLED" } } },
          },
          movements: {
            where: { type: "OUT", concept: { contains: "MERMA" } },
          },
        },
      },
    },
    orderBy: { batchNumber: "desc" },
    take: limite,
  });

  return {
    cantidadLotesEncontrados: batches.length,
    lotes: batches.map((b) => {
      const totalCabezas = b.closure?.totalHeads ?? b.details.reduce((s, d) => s + d.quantity, 0);
      const pesoBruto = b.closure?.totalGrossWeight ?? b.details.reduce((s, d) => s + d.netWeight, 0);
      const costoCompra = b.closure?.totalValue || 0;
      const gastosAsociados = b.expenses.reduce((s, e) => s + e.amount, 0);

      let ventasGeneradas = 0;
      let costoVendido = 0;
      let costoMermas = 0;
      let stockRestanteKg = 0;

      for (const lot of b.inventoryLots) {
        stockRestanteKg += lot.currentStock;
        for (const sd of lot.saleDetails) {
          ventasGeneradas += sd.quantityKg * sd.salePrice;
          costoVendido += sd.quantityKg * lot.unitCost;
        }
        for (const m of lot.movements) {
          costoMermas += m.quantity * lot.unitCost;
        }
      }

      const resultadoNeto = ventasGeneradas - costoVendido - gastosAsociados - costoMermas;

      return {
        numeroLote: b.batchNumber,
        fecha: formatDatePY(b.date),
        estado: b.status,
        modalidad: b.isHookPurchase ? "Compra al Gancho" : b.isLiveSale ? "Venta en Pie" : "Compra en Pie / Faena",
        proveedor: b.provider.legalName,
        frigorificoMatadero: b.slaughterhouse?.legalName || "-",
        descripcion: b.description || "-",
        cabezas: totalCabezas,
        pesoBrutoEnPie: fmtKg(pesoBruto),
        cierreCompra: b.closure
          ? {
              pesoLiquidoPagado: fmtKg(b.closure.totalLiquidWeight),
              kilosDesbaste: fmtKg(b.closure.discountWeight),
              valorTotalPagado: fmtGs(b.closure.totalValue),
              preciosPorCategoria: b.closure.prices.map((p) => ({
                categoria: p.item.name,
                kilosLiquidos: fmtKg(p.liquidWeight),
                precioPorKg: fmtGs(p.pricePerKg),
              })),
            }
          : "Aún sin cierre de compra",
        faena: b.slaughter
          ? {
              fechaFaena: formatDatePY(b.slaughter.date),
              totalKilosGancho: fmtKg(b.slaughter.totalCarcassWeight),
              rendimientoPorcentaje: `${b.slaughter.performance.toFixed(2)}%`,
              detalleProducido: b.slaughter.details.map((sd) => ({
                producto: sd.item.name,
                kilos: fmtKg(sd.weight),
              })),
            }
          : "Sin faena registrada",
        rentabilidadYGastosDelLote: {
          costoCompraHacienda: fmtGs(costoCompra),
          gastosDelLote: fmtGs(gastosAsociados),
          ingresosPorVentas: fmtGs(ventasGeneradas),
          utilidadNetaActual: fmtGs(resultadoNeto),
          stockAunEnCamara: fmtKg(stockRestanteKg),
        },
      };
    }),
  };
}

// ============================================================================
// 8. VENTAS
// ============================================================================
export async function consultarVentas(args?: {
  busquedaCliente?: string;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
  limite?: number;
}) {
  const limite = Math.min(Math.max(args?.limite || 15, 1), 30);
  const search = args?.busquedaCliente?.trim();

  const whereDate: any = {};
  if (args?.fechaDesde) whereDate.gte = startOfDayPY(args.fechaDesde);
  if (args?.fechaHasta) whereDate.lte = endOfDayPY(args.fechaHasta);

  const whereClause: any = {
    status: { not: "CANCELLED" },
    ...(Object.keys(whereDate).length > 0 ? { date: whereDate } : {}),
    ...(search
      ? {
          client: {
            OR: [
              { legalName: { contains: search, mode: "insensitive" } },
              { tradeName: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [agg, sales] = await Promise.all([
    prisma.sale.aggregate({
      where: whereClause,
      _sum: { totalValue: true, netValue: true },
      _count: { id: true },
    }),
    prisma.sale.findMany({
      where: whereClause,
      include: {
        client: true,
        details: {
          include: {
            item: true,
            inventoryLot: { include: { batch: true } },
          },
        },
        accountsReceivable: true,
      },
      orderBy: { date: "desc" },
      take: limite,
    }),
  ]);

  return {
    resumenFiltro: {
      cantidadVentas: agg._count.id,
      montoTotalBruto: fmtGs(agg._sum.totalValue || 0),
      montoTotalNeto: fmtGs(agg._sum.netValue || 0),
    },
    ultimasVentasMostradas: sales.map((s) => {
      const totalKilos = s.details.reduce((acc, d) => acc + d.quantityKg, 0);
      const rec = s.accountsReceivable[0];
      const saldoPendiente = rec ? rec.amount - rec.paidAmount : 0;

      return {
        fecha: formatDatePY(s.date),
        factura: s.invoiceNumber || "Sin factura",
        cliente: s.client.legalName,
        nombreComercialCliente: s.client.tradeName || "-",
        rucCliente: s.client.ruc || "Sin RUC registrado",
        kilosTotales: fmtKg(totalKilos),
        totalVenta: fmtGs(s.totalValue),
        saldoPendienteDeCobro: fmtGs(saldoPendiente),
        estadoCobro: rec ? (rec.status === "PAID" ? "COBRADA" : rec.status === "PARTIAL" ? "COBRO PARCIAL" : "PENDIENTE") : "-",
        items: s.details.map((d) => ({
          producto: d.item.name,
          loteOrigen: d.inventoryLot?.batch ? `Lote #${d.inventoryLot.batch.batchNumber}` : "Inicial",
          kilos: fmtKg(d.quantityKg),
          precioPorKg: fmtGs(d.salePrice),
          subtotal: fmtGs(d.totalValue),
        })),
      };
    }),
  };
}

// ============================================================================
// 9. GASTOS OPERATIVOS
// ============================================================================
export async function consultarGastos(args?: {
  categoria?: string;
  busquedaProveedor?: string;
  fechaDesde?: string; // YYYY-MM-DD
  fechaHasta?: string; // YYYY-MM-DD
  limite?: number;
}) {
  const limite = Math.min(Math.max(args?.limite || 20, 1), 40);
  const whereDate: any = {};
  if (args?.fechaDesde) whereDate.gte = startOfDayPY(args.fechaDesde);
  if (args?.fechaHasta) whereDate.lte = endOfDayPY(args.fechaHasta);

  const whereClause: any = {
    ...(Object.keys(whereDate).length > 0 ? { date: whereDate } : {}),
    ...(args?.categoria
      ? { category: { name: { contains: args.categoria.trim(), mode: "insensitive" } } }
      : {}),
    ...(args?.busquedaProveedor
      ? { provider: { legalName: { contains: args.busquedaProveedor.trim(), mode: "insensitive" } } }
      : {}),
  };

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    include: {
      category: true,
      provider: true,
      batch: true,
    },
    orderBy: { date: "desc" },
  });

  const totalGastos = expenses.reduce((acc, e) => acc + e.amount, 0);
  const porCategoria: Record<string, number> = {};
  for (const e of expenses) {
    porCategoria[e.category.name] = (porCategoria[e.category.name] || 0) + e.amount;
  }

  return {
    totalGastosConsultados: fmtGs(totalGastos),
    cantidadRegistros: expenses.length,
    resumenPorCategoria: Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, monto]) => ({
        categoria: cat,
        montoTotal: fmtGs(monto),
      })),
    ultimosGastos: expenses.slice(0, limite).map((e) => ({
      fecha: formatDatePY(e.date),
      categoria: e.category.name,
      proveedor: e.provider.legalName,
      loteAsociado: e.batch ? `Lote #${e.batch.batchNumber}` : "-",
      descripcion: e.description,
      monto: fmtGs(e.amount),
    })),
  };
}

// ============================================================================
// 10. CLIENTES Y PROVEEDORES (DIRECTORIO Y FICHA)
// ============================================================================
export async function consultarClientesYProveedores(args: {
  tipo: "CLIENTE" | "PROVEEDOR" | "AMBOS";
  busqueda?: string;
}) {
  const search = args.busqueda?.trim();
  const result: any = {};

  if (args.tipo === "CLIENTE" || args.tipo === "AMBOS") {
    const clients = await prisma.client.findMany({
      where: search
        ? {
            OR: [
              { legalName: { contains: search, mode: "insensitive" } },
              { tradeName: { contains: search, mode: "insensitive" } },
              { ruc: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        accountsReceivable: { where: { status: { not: "PAID" } } },
      },
      take: 25,
      orderBy: { legalName: "asc" },
    });

    result.clientes = clients.map((c) => {
      const deuda = c.accountsReceivable.reduce((acc, r) => acc + (r.amount - r.paidAmount), 0);
      return {
        nombreRazonSocial: c.legalName,
        nombreComercial: c.tradeName || "-",
        ruc: c.ruc || "-",
        telefono: c.phone || "-",
        contacto: c.contact || "-",
        plazoCreditoDias: c.paymentTermDays,
        deudaActualPendiente: fmtGs(deuda),
      };
    });
  }

  if (args.tipo === "PROVEEDOR" || args.tipo === "AMBOS") {
    const providers = await prisma.provider.findMany({
      where: search
        ? {
            OR: [
              { legalName: { contains: search, mode: "insensitive" } },
              { tradeName: { contains: search, mode: "insensitive" } },
              { ruc: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        accountsPayable: { where: { status: { not: "PAID" } } },
      },
      take: 25,
      orderBy: { legalName: "asc" },
    });

    result.proveedores = providers.map((p) => {
      const saldoPagar = p.accountsPayable.reduce((acc, a) => acc + (a.amount - a.paidAmount), 0);
      return {
        nombreRazonSocial: p.legalName,
        nombreComercial: p.tradeName || "-",
        ruc: p.ruc || "-",
        telefono: p.phone || "-",
        esFrigorificoMatadero: p.isSlaughterhouse ? "Sí" : "No",
        deudaPendienteConProveedor: fmtGs(saldoPagar),
      };
    });
  }

  return result;
}

// ============================================================================
// 11. ACCIONISTAS, PARTICIPANTES E HISTORIAL DE CIERRES
// ============================================================================
export async function consultarAccionistasYCierres() {
  const [distInputs, closures] = await Promise.all([
    loadDistributionInputs(),
    prisma.monthlyClosure.findMany({
      orderBy: { periodEnd: "desc" },
      take: 10,
      include: {
        shareholderHistory: {
          include: { shareholder: true },
        },
      },
    }),
  ]);

  return {
    accionistasActivos: distInputs.shareholders.map((s) => ({
      nombre: s.name,
      capitalActualInicioPeriodo: fmtGs(s.initialCapital),
    })),
    participantesActivos: distInputs.participants.map((p) => ({
      nombre: p.name,
      porcentajeSobreUtilidadBruta: `${p.profitShare}%`,
      porcentajeRetenido: `${p.retentionRate}%`,
      saldoRetencionAcumuladoDeudaEmpresa: fmtGs(p.retentionBalance),
    })),
    historialCierresDePeriodo: closures.map((c) => ({
      fechaCierre: c.closingDate,
      periodo: `${formatDatePY(c.periodStart)} al ${formatDatePY(c.periodEnd)}`,
      estado: c.status,
      capitalInicial: fmtGs(c.previousCapital),
      utilidadBruta: fmtGs(c.netIncome),
      participacionParticipantes: fmtGs(c.participantShare),
      capitalFinalNeto: fmtGs(c.totalCapital),
      distribucionPorPersona: c.shareholderHistory.map((h) => ({
        nombre: h.shareholder.name,
        tipo: h.shareholder.type,
        capitalInicial: fmtGs(h.initialCapital),
        utilidadAsignada: fmtGs(h.profitAmount),
        capitalizadoORetenido: fmtGs(h.capitalizedAmount),
        retiroOSalario: fmtGs(h.withdrawalAmount),
        capitalFinal: fmtGs(h.finalCapital),
      })),
    })),
  };
}

// ============================================================================
// 12. RANKING DE PROVEEDORES (RENDIMIENTO EN FAENA) Y RENTABILIDAD
// ============================================================================
export async function consultarRankingProveedoresYRentabilidad() {
  const rankingSlaughters = await prisma.slaughter.findMany({
    where: { batch: { isHookPurchase: false } },
    include: {
      batch: {
        include: {
          provider: true,
          details: { include: { item: true } },
          closure: { include: { prices: { include: { item: true } } } },
        },
      },
      details: { include: { item: true } },
    },
  });

  const providerStats: Record<
    string,
    { name: string; globalLive: number; globalCarcass: number; lotes: number }
  > = {};

  for (const s of rankingSlaughters) {
    const pName = s.batch.provider?.legalName || "Desconocido";
    if (!providerStats[pName]) {
      providerStats[pName] = { name: pName, globalLive: 0, globalCarcass: 0, lotes: 0 };
    }
    providerStats[pName].lotes += 1;

    const liveWt = s.batch.closure
      ? s.batch.closure.prices.reduce((acc, p) => acc + p.liquidWeight, 0)
      : s.batch.details.reduce((acc, d) => acc + d.netWeight, 0);

    const carcassWt = s.details.reduce((acc, d) => acc + d.weight, 0);

    providerStats[pName].globalLive += liveWt;
    providerStats[pName].globalCarcass += carcassWt;
  }

  const rankingRendimiento = Object.values(providerStats)
    .filter((p) => p.globalLive > 0 && p.globalCarcass > 0)
    .map((p) => ({
      proveedor: p.name,
      cantidadFaenas: p.lotes,
      kilosEnPieTotales: fmtKg(p.globalLive),
      kilosEnGanchoTotales: fmtKg(p.globalCarcass),
      rendimientoPromedio: `${((p.globalCarcass / p.globalLive) * 100).toFixed(2)}%`,
      rendimientoNum: (p.globalCarcass / p.globalLive) * 100,
    }))
    .sort((a, b) => b.rendimientoNum - a.rendimientoNum);

  return {
    rankingRendimientoFaenaPorProveedor: rankingRendimiento.map(({ rendimientoNum, ...rest }) => rest),
  };
}

// ============================================================================
// DECLARACIÓN DE HERRAMIENTAS PARA GEMINI FUNCTION CALLING
// ============================================================================
export const GEMINI_TOOLS_DECLARATIONS = [
  {
    name: "obtenerResumenGeneralYCapital",
    description:
      "Obtiene el resumen general en tiempo real del negocio (Dashboard Gerencial): capital total actual, utilidad del período abierto, saldo en bancos, stock en cámara y en pie, cuentas por cobrar, cuentas por pagar, cheques en cartera, ventas/compras/gastos del período y distribución estimada entre accionistas y participantes.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "consultarSaldosBancarios",
    description:
      "Consulta el saldo actual de todas las cuentas bancarias y cajas, junto con sus últimos movimientos (ingresos, egresos, transferencias).",
    parameters: {
      type: "OBJECT",
      properties: {
        incluirUltimosMovimientos: {
          type: "BOOLEAN",
          description: "Si es true, incluye las últimas transacciones de cada banco.",
        },
        limiteMovimientos: {
          type: "INTEGER",
          description: "Cantidad de últimos movimientos por banco a devolver (por defecto 10).",
        },
      },
    },
  },
  {
    name: "consultarCuentasPorCobrar",
    description:
      "Consulta las deudas de clientes a favor de la empresa (cuentas por cobrar pendientes o parciales). Permite filtrar por nombre del cliente.",
    parameters: {
      type: "OBJECT",
      properties: {
        busquedaCliente: {
          type: "STRING",
          description: "Nombre o RUC del cliente a buscar (opcional). Si se omite, trae todos los clientes que deben.",
        },
        incluirPagadas: {
          type: "BOOLEAN",
          description: "Si es true, también muestra cuentas que ya fueron cobradas totalmente.",
        },
      },
    },
  },
  {
    name: "consultarCuentasPorPagar",
    description:
      "Consulta las deudas que la empresa tiene pendientes de pago con proveedores (por compra de lotes de hacienda, gastos o préstamos).",
    parameters: {
      type: "OBJECT",
      properties: {
        busquedaProveedor: {
          type: "STRING",
          description: "Nombre o RUC del proveedor a buscar (opcional).",
        },
        incluirPagadas: {
          type: "BOOLEAN",
          description: "Si es true, incluye cuentas ya pagadas.",
        },
      },
    },
  },
  {
    name: "consultarChequesEnCartera",
    description:
      "Consulta los cheques recibidos de clientes que están en cartera (por depositar), depositados o rechazados, con sus fechas de vencimiento y montos.",
    parameters: {
      type: "OBJECT",
      properties: {
        estado: {
          type: "STRING",
          enum: ["IN_PORTFOLIO", "DEPOSITED", "REJECTED", "TODOS"],
          description: "Estado de los cheques. Por defecto IN_PORTFOLIO (en cartera).",
        },
      },
    },
  },
  {
    name: "consultarInventarioYStock",
    description:
      "Consulta el inventario actual de carne y menudencias en cámara frigorífica (kilos disponibles, costo por kg y valor total por lote y producto) y el stock de hacienda en pie sin faenar.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "consultarLotesYFaenas",
    description:
      "Consulta información detallada de compras de hacienda (Lotes), romaneo, precios pagados, resultados y rendimiento de faena (kilos en gancho y %), gastos del lote y rentabilidad.",
    parameters: {
      type: "OBJECT",
      properties: {
        numeroLote: {
          type: "INTEGER",
          description: "Número específico de lote a consultar (ej: 12). Opcional.",
        },
        busquedaProveedor: {
          type: "STRING",
          description: "Nombre del proveedor de hacienda para filtrar lotes (opcional).",
        },
        limite: {
          type: "INTEGER",
          description: "Cantidad de lotes recientes a consultar (por defecto 10).",
        },
      },
    },
  },
  {
    name: "consultarVentas",
    description:
      "Consulta las ventas realizadas, kilos vendidos, precios de venta, facturas y clientes. Permite filtrar por cliente o rango de fechas.",
    parameters: {
      type: "OBJECT",
      properties: {
        busquedaCliente: {
          type: "STRING",
          description: "Nombre del cliente (opcional).",
        },
        fechaDesde: {
          type: "STRING",
          description: "Fecha inicial en formato YYYY-MM-DD (opcional).",
        },
        fechaHasta: {
          type: "STRING",
          description: "Fecha final en formato YYYY-MM-DD (opcional).",
        },
        limite: {
          type: "INTEGER",
          description: "Cantidad de ventas a listar (por defecto 15).",
        },
      },
    },
  },
  {
    name: "consultarGastos",
    description:
      "Consulta los gastos operativos del negocio agrupados por categoría (ej. Combustible, Flete, Faena, Sueldos) y el listado detallado de gastos.",
    parameters: {
      type: "OBJECT",
      properties: {
        categoria: {
          type: "STRING",
          description: "Nombre de la categoría de gasto a buscar (opcional).",
        },
        busquedaProveedor: {
          type: "STRING",
          description: "Nombre del proveedor del gasto (opcional).",
        },
        fechaDesde: {
          type: "STRING",
          description: "Fecha inicial en formato YYYY-MM-DD (opcional).",
        },
        fechaHasta: {
          type: "STRING",
          description: "Fecha final en formato YYYY-MM-DD (opcional).",
        },
        limite: {
          type: "INTEGER",
          description: "Cantidad máxima de gastos individuales a listar (por defecto 20).",
        },
      },
    },
  },
  {
    name: "consultarClientesYProveedores",
    description:
      "Busca datos de contacto (teléfono, RUC, dirección, plazos) y saldos de clientes o proveedores.",
    parameters: {
      type: "OBJECT",
      properties: {
        tipo: {
          type: "STRING",
          enum: ["CLIENTE", "PROVEEDOR", "AMBOS"],
          description: "Si desea buscar clientes, proveedores o ambos.",
        },
        busqueda: {
          type: "STRING",
          description: "Nombre o RUC a buscar (opcional).",
        },
      },
      required: ["tipo"],
    },
  },
  {
    name: "consultarAccionistasYCierres",
    description:
      "Consulta el capital de los accionistas (ej. CSDF, MH), las retenciones/participación de los participantes (ej. YL) y el historial de cierres de período anteriores.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "consultarRankingProveedoresYRentabilidad",
    description:
      "Consulta el ranking histórico de proveedores de ganado según su porcentaje de rendimiento en faena (kilos en gancho vs kilos en pie).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
];

export async function executeErpTool(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "obtenerResumenGeneralYCapital":
        return await obtenerResumenGeneralYCapital();
      case "consultarSaldosBancarios":
        return await consultarSaldosBancarios(args);
      case "consultarCuentasPorCobrar":
        return await consultarCuentasPorCobrar(args);
      case "consultarCuentasPorPagar":
        return await consultarCuentasPorPagar(args);
      case "consultarChequesEnCartera":
        return await consultarChequesEnCartera(args);
      case "consultarInventarioYStock":
        return await consultarInventarioYStock();
      case "consultarLotesYFaenas":
        return await consultarLotesYFaenas(args);
      case "consultarVentas":
        return await consultarVentas(args);
      case "consultarGastos":
        return await consultarGastos(args);
      case "consultarClientesYProveedores":
        return await consultarClientesYProveedores(args || { tipo: "AMBOS" });
      case "consultarAccionistasYCierres":
        return await consultarAccionistasYCierres();
      case "consultarRankingProveedoresYRentabilidad":
        return await consultarRankingProveedoresYRentabilidad();
      default:
        return { error: `Herramienta desconocida: ${name}` };
    }
  } catch (error: any) {
    console.error(`Error ejecutando herramienta ${name}:`, error);
    return { error: error.message || "Error consultando la base de datos" };
  }
}
