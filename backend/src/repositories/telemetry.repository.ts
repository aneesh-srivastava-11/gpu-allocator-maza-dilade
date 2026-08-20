import { prisma } from '../db';
import { TelemetryReport } from '@prisma/client';

export class TelemetryRepository {
  public static async create(data: {
    sessionId: number;
    gpuUtilPct: number;
    processSignature: any;
    networkConnections: any;
  }): Promise<TelemetryReport> {
    return prisma.telemetryReport.create({
      data: {
        sessionId: data.sessionId,
        gpuUtilPct: data.gpuUtilPct,
        processSignature: data.processSignature,
        networkConnections: data.networkConnections,
      },
    });
  }

  public static async pruneRoutineTelemetry(cutoffDate: Date): Promise<number> {
    // Keep telemetry reports linked to flags
    const flaggedReports = await prisma.flag.findMany({
      where: { telemetryReportId: { not: null } },
      select: { telemetryReportId: true },
    });
    const flaggedIds = flaggedReports.map(f => f.telemetryReportId!).filter(Boolean);

    const result = await prisma.telemetryReport.deleteMany({
      where: {
        reportedAt: { lte: cutoffDate },
        id: { notIn: flaggedIds },
      },
    });
    return result.count;
  }
}
