import { FlagType } from '@prisma/client';

const MINING_PORTS = new Set([3333, 4444, 14444, 8333, 9333]);
const MINING_KEYWORDS = ['mine', 'miner', 'stratum', 'pool', 'nicehash', 'xmrig', 'ethminer', 'cgminer'];
const ML_KEYWORDS = ['python', 'torch', 'jupyter', 'cuda', 'tensorflow', 'nvcc', 'vllm', 'ollama', 'train', 'python3', 'node'];

export interface TelemetryPayload {
  gpu_util_pct: number;
  process_signature: Array<{ pid?: number; name?: string; cmd?: string }>;
  network_connections: Array<{ dest?: string; port?: number }>;
}

export class MisuseDetectorService {
  public static evaluate(payload: TelemetryPayload): {
    isFlagged: boolean;
    flagType?: FlagType;
    evidence?: any;
  } {
    // STAGE 1: Fast-Path Mining Check (Network / Process signatures)
    const miningEvidence: any[] = [];
    for (const conn of payload.network_connections || []) {
      const port = Number(conn.port || 0);
      const dest = String(conn.dest || '').toLowerCase();
      if (MINING_PORTS.has(port) || MINING_KEYWORDS.some(kw => dest.includes(kw))) {
        miningEvidence.push(conn);
      }
    }

    for (const proc of payload.process_signature || []) {
      const name = String(proc.name || proc.cmd || '').toLowerCase();
      if (MINING_KEYWORDS.some(kw => name.includes(kw))) {
        miningEvidence.push(proc);
      }
    }

    if (miningEvidence.length > 0) {
      return {
        isFlagged: true,
        flagType: FlagType.mining,
        evidence: {
          reason: 'Fast-Path: Mining pool network connection or binary detected',
          detections: miningEvidence,
          gpu_util_pct: payload.gpu_util_pct,
        },
      };
    }

    // STAGE 2: High GPU Utilization without expected Academic ML processes
    if (payload.gpu_util_pct > 80.0) {
      const hasMlProcess = (payload.process_signature || []).some(proc => {
        const cmd = String(proc.cmd || proc.name || '').toLowerCase();
        return ML_KEYWORDS.some(kw => cmd.includes(kw));
      });

      if (!hasMlProcess) {
        return {
          isFlagged: true,
          flagType: FlagType.other,
          evidence: {
            reason: 'High GPU Utilization (80%+) without academic ML/Python workload',
            gpu_util_pct: payload.gpu_util_pct,
            processes: payload.process_signature,
          },
        };
      }
    }

    return { isFlagged: false };
  }
}
