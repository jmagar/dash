import { startHostMonitoring, stopHostMonitoring } from './monitoring';
import { closeConnection, testSSHConnection } from './pool';
import type { Host, CreateHostRequest, UpdateHostRequest } from './types';
import { cacheHostStatus, getHostStatus, invalidateHostCache } from '../../cache';
import { query, transaction } from '../../db';

export async function listHosts(): Promise<Host[]> {
  const cachedHosts = await getHostStatus('all');
  if (cachedHosts) {
    return cachedHosts as Host[];
  }

  const result = await query<Host>(
    'SELECT * FROM hosts ORDER BY name',
    [],
  );

  const hosts = result.rows;
  await cacheHostStatus('all', hosts);
  return hosts;
}

export async function getHost(id: string): Promise<Host> {
  const cachedHost = await getHostStatus(id);
  if (cachedHost) {
    return cachedHost as Host;
  }

  const result = await query<Host>(
    'SELECT h.*, sk.name as key_name FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
    [id],
  );

  if (result.rows.length === 0) {
    throw new Error('Host not found');
  }

  const host = result.rows[0];
  await cacheHostStatus(id, host);
  return host;
}

export async function createHost(data: CreateHostRequest): Promise<Host> {
  const { name, hostname, port, ip, username, password, sshKeyId } = data;

  // Test connection before creating host
  await testSSHConnection({
    host: hostname,
    port,
    username,
    password,
  });

  const result = await transaction(async (client) => {
    // Check if host already exists
    const existing = await client.query(
      'SELECT id FROM hosts WHERE hostname = $1 AND port = $2',
      [hostname, port],
    );

    if (existing.rows.length > 0) {
      throw new Error('Host already exists');
    }

    // Create new host
    const result = await client.query<Host>(
      'INSERT INTO hosts (name, hostname, port, ip, username, password, ssh_key_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *',
      [name, hostname, port, ip, username, password, sshKeyId],
    );

    const host = result.rows[0];

    // Start monitoring the new host
    await startHostMonitoring(host);

    return host;
  });

  await invalidateHostCache('all');
  return result;
}

export async function updateHost(id: string, data: UpdateHostRequest): Promise<Host> {
  const { name, hostname, port, ip, username, password, sshKeyId, isActive } = data;

  // If connection details changed, test connection first
  if (hostname || port || username || password) {
    await testSSHConnection({
      host: hostname,
      port,
      username,
      password,
    });
  }

  const result = await transaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM hosts WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      throw new Error('Host not found');
    }

    const result = await client.query<Host>(
      `UPDATE hosts
       SET name = $1, hostname = $2, port = $3, ip = $4, username = $5, password = $6, ssh_key_id = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, hostname, port, ip, username, password, sshKeyId, isActive, id],
    );

    const host = result.rows[0];

    // Update host monitoring
    if (isActive) {
      await startHostMonitoring(host);
    } else {
      stopHostMonitoring(host.id);
      await closeConnection(host.id);
    }

    return host;
  });

  await invalidateHostCache(id);
  await invalidateHostCache('all');
  return result;
}

export async function deleteHost(id: string): Promise<void> {
  await transaction(async (client) => {
    // Check for active connections or dependencies
    const activeCommands = await client.query<{ count: string }>(
      'SELECT COUNT(*) FROM command_history WHERE host_id = $1 AND created_at > NOW() - INTERVAL \'5 minutes\'',
      [id],
    );

    if (parseInt(activeCommands.rows[0].count) > 0) {
      throw new Error('Host has active connections');
    }

    // Stop monitoring and close connections before deleting
    stopHostMonitoring(id);
    await closeConnection(id);

    await client.query('DELETE FROM hosts WHERE id = $1', [id]);
  });

  await invalidateHostCache(id);
  await invalidateHostCache('all');
}

export async function testHost(id: string): Promise<void> {
  const result = await query<Host>(
    'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
    [id],
  );

  if (result.rows.length === 0) {
    throw new Error('Host not found');
  }

  const host = result.rows[0];

  try {
    await testSSHConnection({
      host: host.hostname,
      port: host.port,
      username: host.username,
      password: host.password,
      privateKey: host.private_key,
      passphrase: host.passphrase,
    });

    // Update host status to active
    await query(
      'UPDATE hosts SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    );

    await invalidateHostCache(id);
    await invalidateHostCache('all');

    // Start monitoring if not already started
    await startHostMonitoring(host);
  } catch (error) {
    // Update host status to inactive
    await query(
      'UPDATE hosts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    );
    await invalidateHostCache(id);
    await invalidateHostCache('all');

    // Stop monitoring and close connection
    stopHostMonitoring(id);
    await closeConnection(id);

    throw error;
  }
}
