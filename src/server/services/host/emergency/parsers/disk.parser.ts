import { DiskUsage } from '../types';

export class DiskParser {
  /**
   * Parse disk usage from df output
   */
  static parse(output: string): DiskUsage {
    const lines = output.split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid df output format');
    }

    const line = lines[1];
    if (!line) {
      throw new Error('Invalid df output format: missing data line');
    }

    const parts = line.split(/\s+/);
    if (parts.length < 5) {
      throw new Error('Invalid df output format: insufficient columns');
    }

    const total = parts[1];
    const used = parts[2];
    const usageStr = parts[4];

    if (!total || !used || !usageStr) {
      throw new Error('Invalid df output format: missing required values');
    }

    const percentStr = usageStr.replace('%', '');
    const percent = parseInt(percentStr, 10);
    if (isNaN(percent)) {
      throw new Error('Invalid disk usage value');
    }

    const totalValue = parseInt(total, 10);
    const usedValue = parseInt(used, 10);
    if (isNaN(totalValue) || isNaN(usedValue)) {
      throw new Error('Invalid disk values');
    }

    return { 
      used: usedValue,
      total: totalValue,
      percent 
    };
  }
}
