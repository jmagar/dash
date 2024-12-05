import { Router } from 'express';
import { SSHKeyService } from '../../services/sshkeys';
import { validateSession } from '../../middleware/auth';

const router = Router();
const sshKeyService = new SSHKeyService();

router.use(validateSession);

// Get SSH key distribution status
router.get('/status', async (req, res) => {
    const status = await sshKeyService.getStatus();
    res.json(status);
});

// Initiate key distribution
router.post('/distribute', async (req, res) => {
    try {
        await sshKeyService.initiateKeyDistribution();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update agent key status
router.post('/agent/:agentId/status', async (req, res) => {
    const { agentId } = req.params;
    const { status } = req.body;
    await sshKeyService.updateAgentStatus(agentId, status);
    res.json({ success: true });
});

export default router;
