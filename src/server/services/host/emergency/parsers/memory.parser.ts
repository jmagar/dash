import { MemoryUsage } from '../types';

export class MemoryParser {
  /**
   * Parse memory usage from free output
   */
  static parse(output: string): MemoryUsage {
    const lines = output.split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid free output format');
    }

    const line = lines[1];
    if (!line) {
      throw new Error('Invalid free output format: missing data line');
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 3) {
      throw new Error('Invalid free output format: insufficient columns');
    }

    const total = parts[1];
    const used = parts[2];

    if (!total || !used) {
      throw new Error('Invalid free output format: missing required values');
    }

    const totalValue = parseInt(total, 10);
    const usedValue = parseInt(used, 10);
    if (isNaN(totalValue) || isNaN(usedValue)) {
      throw new Error('Invalid memory values');
    }

    const percent = (usedValue / totalValue) * 100;
    
    return { 
      used: usedValue,
      total: totalValue,
      percent 
    };
  }
}
