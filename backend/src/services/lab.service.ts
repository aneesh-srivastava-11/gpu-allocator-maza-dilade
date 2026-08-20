import { LabRepository } from '../repositories/lab.repository';

export class LabService {
  public static async listLabs() {
    const labs = await LabRepository.findAll();
    return labs.map(lab => {
      const gpus = lab.machines || [];
      return {
        id: lab.id,
        name: lab.name,
        location: lab.location,
        total_gpus: gpus.length,
        idle_gpus: gpus.filter(g => g.status === 'idle').length,
        allocated_gpus: gpus.filter(g => g.status === 'allocated').length,
        blocked_gpus: gpus.filter(g => g.status === 'blocked').length,
      };
    });
  }
}
