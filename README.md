# Proxy OpenAI (Vercel)

Ce dossier contient un petit endpoint Vercel qui permet à `admin.html` d'appeler OpenAI **sans exposer la clé API dans le navigateur** (et sans problème CORS).

## Déploiement (Vercel)

1. Crée un nouveau projet Vercel en important le dossier `vercel-proxy/`.
2. Ajoute ces variables d'environnement dans Vercel (Project Settings → Environment Variables) :
   - `OPENAI_API_KEY` : ta clé OpenAI
   - (optionnel) `OPENAI_MODEL` : ex `gpt-4o-mini`
   - (optionnel) `ALLOWED_ORIGINS` : liste séparée par virgules, ex :
     - `https://misterdilecoute.web.app,https://misterdil.ca`
3. Déploie.

## Utilisation côté Admin

Dans la modale IA, colle l'URL :

`https://<ton-projet>.vercel.app/api/ai-generate`

Ensuite tu peux laisser la clé OpenAI vide (le proxy utilise la clé côté serveur).
