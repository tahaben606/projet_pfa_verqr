/**
 * French certificate wording per attestation type (issued PDF body).
 */

export function formatFrDate(iso) {
  if (!iso) return '';
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

function splitBeneficiaryName(b) {
  if (b?.first_name && b?.last_name) {
    return { prenom: b.first_name, nom: b.last_name };
  }
  const parts = (b?.name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { prenom: parts.slice(0, -1).join(' '), nom: parts[parts.length - 1] };
  }
  return { prenom: parts[0] || '', nom: '' };
}

/**
 * @param {{ typeName: string; beneficiary: object; formPayload: object }} p
 * @returns {string}
 */
export function buildFrenchCertificateParagraph({ typeName, beneficiary, formPayload }) {
  const f = formPayload || {};
  const { prenom, nom } = splitBeneficiaryName(beneficiary);
  const codeInterne = beneficiary?.internal_code || '';
  const structure = beneficiary?.structure || '';
  const filiereService = beneficiary?.service_branch || '';
  const dateNaissance = formatFrDate(beneficiary?.birth_date);

  const t = (typeName || '').trim();

  if (t === 'Attestation de Scolarité') {
    return (
      `Cette attestation certifie que\n` +
      `${prenom} ${nom}\n` +
      `inscrit sous le code ${codeInterne}\n` +
      `dans la filière ${filiereService}\n` +
      `au sein de ${structure}\n` +
      `est régulièrement inscrit pour l'année universitaire ${f.anneeAcademique || '—'}.\n\n` +
      `Niveau : ${f.niveau || '—'}.\n` +
      `Date d'inscription : ${formatFrDate(f.dateInscription) || '—'}.`
    );
  }

  if (t === 'Attestation de Stage') {
    const lines = [
      'Cette attestation certifie que',
      `${prenom} ${nom}`,
      `a effectué un stage chez ${f.entreprise || '—'}`,
      `du ${formatFrDate(f.dateDebut) || '—'} au ${formatFrDate(f.dateFin) || '—'}`,
      `sous l'encadrement de ${f.encadrant || '—'}.`,
    ];
    if (structure) lines.push('', `Structure d'origine : ${structure}.`);
    return lines.join('\n');
  }

  if (t === 'Attestation de Travail') {
    return (
      `Cette attestation certifie que\n` +
      `${prenom} ${nom}\n` +
      `occupe le poste de ${f.poste || '—'}\n` +
      `au sein de ${structure || '—'}\n` +
      `depuis le ${formatFrDate(f.dateEmbauche) || '—'}\n` +
      `dans le cadre d'un contrat ${f.typeContrat || '—'}.`
    );
  }

  if (t === 'Attestation de Formation') {
    return (
      `Cette attestation certifie que\n` +
      `${prenom} ${nom}\n` +
      `a complété la formation ${f.intituleFormation || '—'}\n` +
      `d'une durée de ${f.dureeHeures != null ? String(f.dureeHeures) : '—'} heures\n` +
      `le ${formatFrDate(f.dateCompletion) || '—'}\n` +
      `encadrée par ${f.formateur || '—'}.`
    );
  }

  if (t === 'Attestation de Participation') {
    return (
      `Cette attestation certifie que\n` +
      `${prenom} ${nom}\n` +
      `a participé à l'événement ${f.evenement || '—'}\n` +
      `organisé par ${f.organisateur || '—'}\n` +
      `le ${formatFrDate(f.dateEvenement) || '—'}.`
    );
  }

  if (t === 'Attestation Médicale') {
    let text =
      `Cette attestation certifie que\n` +
      `${prenom} ${nom}\n` +
      `né(e) le ${dateNaissance || '—'}\n` +
      `a passé un examen médical le ${formatFrDate(f.dateExamen) || '—'}\n` +
      `et présente un état médical : ${f.statutMedical || '—'}.\n\n` +
      `Médecin : ${f.medecin || '—'}.`;
    if (f.dateExpiration) {
      text += `\nDate d'expiration : ${formatFrDate(f.dateExpiration)}.`;
    }
    return text;
  }

  return (
    `Cette attestation est délivrée à ${prenom} ${nom}.\n` +
    `Type : ${t || 'Attestation'}.\n` +
    `Détails complémentaires : voir enregistrement interne.`
  );
}
