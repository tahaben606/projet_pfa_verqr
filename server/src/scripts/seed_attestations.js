import { createClient } from '@supabase/supabase-js';
import { env, validateEnv } from '../config/env.js';

validateEnv();

const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ATTESTATIONS = [
  {
    name: 'Attestation de Scolarité',
    description: 'Certifie l’inscription d’un étudiant pour l’année universitaire.',
    dynamic_fields: [
      { name: 'anneeAcademique', label: 'Année Académique', type: 'text', required: true },
      { name: 'dateInscription', label: 'Date d\'Inscription', type: 'date', required: true },
      { name: 'niveau', label: 'Niveau', type: 'text', required: true }
    ],
    version: 1
  },
  {
    name: 'Attestation de Stage',
    description: 'Certifie la réalisation d’un stage au sein d’une entreprise.',
    dynamic_fields: [
      { name: 'entreprise', label: 'Entreprise', type: 'text', required: true },
      { name: 'dateDebut', label: 'Date de Début', type: 'date', required: true },
      { name: 'dateFin', label: 'Date de Fin', type: 'date', required: true },
      { name: 'encadrant', label: 'Encadrant', type: 'text', required: true }
    ],
    version: 1
  },
  {
    name: 'Attestation de Travail',
    description: 'Certifie l’emploi d’un salarié au sein de la structure.',
    dynamic_fields: [
      { name: 'poste', label: 'Poste', type: 'text', required: true },
      { name: 'dateEmbauche', label: 'Date d\'Embauche', type: 'date', required: true },
      { name: 'typeContrat', label: 'Type de Contrat (ex: CDI, CDD)', type: 'text', required: true }
    ],
    version: 1
  },
  {
    name: 'Attestation de Formation',
    description: 'Certifie la complétion d’une formation.',
    dynamic_fields: [
      { name: 'intituleFormation', label: 'Intitulé de la Formation', type: 'text', required: true },
      { name: 'dureeHeures', label: 'Durée (en heures)', type: 'number', required: true },
      { name: 'dateCompletion', label: 'Date de Complétion', type: 'date', required: true },
      { name: 'formateur', label: 'Formateur', type: 'text', required: true }
    ],
    version: 1
  },
  {
    name: 'Attestation de Participation',
    description: 'Certifie la participation à un événement.',
    dynamic_fields: [
      { name: 'evenement', label: 'Nom de l\'Événement', type: 'text', required: true },
      { name: 'dateEvenement', label: 'Date de l\'Événement', type: 'date', required: true },
      { name: 'organisateur', label: 'Organisateur', type: 'text', required: true }
    ],
    version: 1
  },
  {
    name: 'Attestation Médicale',
    description: 'Certifie l’état de santé suite à un examen médical.',
    dynamic_fields: [
      { name: 'dateExamen', label: 'Date de l\'Examen', type: 'date', required: true },
      { name: 'statutMedical', label: 'Statut Médical', type: 'text', required: true },
      { name: 'medecin', label: 'Médecin', type: 'text', required: true },
      { name: 'dateExpiration', label: 'Date d\'Expiration (optionnel)', type: 'date', required: false }
    ],
    version: 1
  }
];

async function seed() {
  console.log('Seeding attestation types...');
  
  for (const att of ATTESTATIONS) {
    // Check if it already exists
    const { data: existing } = await supabaseAdmin
      .from('attestation_types')
      .select('id')
      .eq('name', att.name)
      .maybeSingle();
      
    if (existing) {
      console.log(`- Updating ${att.name}...`);
      await supabaseAdmin
        .from('attestation_types')
        .update({
          description: att.description,
          dynamic_fields: att.dynamic_fields
        })
        .eq('id', existing.id);
    } else {
      console.log(`- Inserting ${att.name}...`);
      await supabaseAdmin
        .from('attestation_types')
        .insert(att);
    }
  }
  
  console.log('Done seeding attestation types.');
}

seed().catch(console.error);
