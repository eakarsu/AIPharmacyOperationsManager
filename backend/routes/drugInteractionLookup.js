const express = require('express');
const router = express.Router();
const https = require('https');
const { callOpenRouter, parseAIJson } = require('../ai');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Parse error')); }
      });
    }).on('error', reject);
  });
}

// GET /api/drug-interactions/lookup?drug1=aspirin&drug2=warfarin
router.get('/lookup', async (req, res) => {
  try {
    const { drug1, drug2 } = req.query;
    if (!drug1 || !drug2) {
      return res.status(400).json({ error: 'drug1 and drug2 query params required' });
    }

    // Step 1: Get RxCUI for each drug
    let rxcui1 = null, rxcui2 = null;
    try {
      const r1 = await httpsGet(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug1)}`);
      rxcui1 = r1?.idGroup?.rxnormId?.[0];
    } catch (_) {}

    try {
      const r2 = await httpsGet(`https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drug2)}`);
      rxcui2 = r2?.idGroup?.rxnormId?.[0];
    } catch (_) {}

    // Step 2: Query interactions if we have both RxCUIs
    let rxnavData = null;
    if (rxcui1 && rxcui2) {
      try {
        rxnavData = await httpsGet(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcui1}+${rxcui2}`);
      } catch (_) {}
    }

    // Parse RxNav interactions
    const interactionPairs = rxnavData?.fullInteractionTypeGroup?.[0]?.fullInteractionType || [];
    const hasRxNavResults = interactionPairs.length > 0;

    if (hasRxNavResults) {
      const interactions = interactionPairs.map(pair => {
        const interaction = pair.interactionPair?.[0] || {};
        return {
          drug1: pair.minConcept?.[0]?.name || drug1,
          drug2: pair.minConcept?.[1]?.name || drug2,
          severity: interaction.severity || 'unknown',
          description: interaction.description || '',
          source: 'RxNav'
        };
      });

      return res.json({
        drug1, drug2,
        rxcui1, rxcui2,
        source: 'RxNav',
        interactions,
        overall_risk: interactions.some(i => i.severity === 'high') ? 'high' : interactions.length > 0 ? 'medium' : 'low'
      });
    }

    // Fallback: AI-powered interaction check
    const prompt = `Check drug interaction between "${drug1}" and "${drug2}".
Return JSON only: {"interactions":[{"drug1":"${drug1}","drug2":"${drug2}","severity":"mild|moderate|severe","description":"","recommendation":""}],"overall_risk":"low|medium|high|critical"}`;

    const aiResponse = await callOpenRouter(prompt, 'You are a clinical pharmacology AI. Return valid JSON only.');
    const parsed = parseAIJson(aiResponse);

    res.json({
      drug1, drug2,
      source: 'AI Fallback',
      rxcui1, rxcui2,
      interactions: parsed?.interactions || [],
      overall_risk: parsed?.overall_risk || 'unknown',
      structured: parsed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
