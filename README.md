# RHS - AutoPresence MDT

`RHS - AutoPresence MDT` est une extension Firefox qui remplit automatiquement
la partie **Présence des adjoints** lors de la rédaction d'un RHS sur le MDT
GtaCityRP.

L'extension récupère les adjoints de la section de supervision de l'utilisateur
ainsi que leur activité de la semaine en cours, puis sélectionne le statut
correspondant dans le formulaire du RHS.

## Site pris en charge

L'extension fonctionne sur :

- `mdt.gtacityrp.fr`

Elle nécessite d'être connecté au MDT et d'avoir accès aux données de sa
section de supervision.

## Installation Chrome / Edge

1. Ouvrez Chrome ou Edge.
2. Accédez à `chrome://extensions` dans Chrome ou à
   `edge://extensions` dans Edge.
3. Activez le **mode développeur**.
4. Cliquez sur **Charger l'extension non empaquetée** (*Load unpacked*).
5. Sélectionnez le dossier du projet
   `extension_mdt_auto_presence`.

L'extension sera alors installée dans le navigateur et active sur le MDT.

## Installation rapide avec un fichier `.xpi` signé par Firefox

Cette méthode est recommandée pour une utilisation normale. Le fichier `.xpi`
doit avoir été signé par Mozilla (par exemple après soumission de l'extension
sur [addons.mozilla.org](https://addons.mozilla.org/)).

1. Téléchargez le fichier `.xpi` signé de l'extension.
2. Ouvrez Firefox.
3. Ouvrez la page `about:addons`.
4. Cliquez sur l'icône en forme de roue dentée.
5. Sélectionnez **Installer un module depuis un fichier…**.
6. Choisissez le fichier `.xpi` téléchargé.
7. Confirmez l'installation lorsque Firefox le demande.

Une fois installée, l'extension sera activée automatiquement sur le MDT.

> Firefox refuse l'installation permanente d'un fichier `.xpi` non signé dans
> une version standard du navigateur. Utilisez alors la procédure temporaire
> ci-dessous pour le développement.

## Installation temporaire pour le développement

Cette installation est supprimée lorsque Firefox redémarre.

1. Ouvrez Firefox.
2. Accédez à `about:debugging#/runtime/this-firefox`.
3. Cliquez sur **Charger un module complémentaire temporaire…**.
4. Sélectionnez le fichier `manifest.json` du projet.

## Utilisation

1. Connectez-vous au [MDT GtaCityRP](https://mdt.gtacityrp.fr/).
2. Ouvrez la page de rédaction d'un RHS.
3. Repérez la section **Présence des adjoints**.
4. Cliquez sur **Remplir automatiquement**.
5. Vérifiez les statuts remplis avant d'enregistrer le RHS.

Les statuts sont déterminés à partir du temps d'activité cumulé pendant la
semaine en cours :

- **Correcte** : au moins 6 heures ;
- **Moyenne** : au moins 3 heures ;
- **Mauvaise** : au moins 1 minute ;
- **Inexistante** : moins d'une minute ;
- **Absence justifiée** : lorsqu'une absence est déclarée dans le MDT.

L'extension ne soumet pas le RHS à la place de l'utilisateur. Elle remplit
uniquement les statuts du formulaire.

## Dépannage

- Vérifiez que vous êtes connecté au MDT avant de cliquer sur
  **Remplir automatiquement**.
- Rechargez la page du RHS après l'installation ou la mise à jour de
  l'extension.
- Si le bouton affiche **Erreur (voir console)**, ouvrez les outils de
  développement de Firefox et consultez la console pour obtenir le détail de
  l'erreur.
- Les noms affichés dans le formulaire doivent correspondre aux adjoints
  récupérés depuis la section de supervision.

## Structure du projet

```text
extension_mdt_auto_presence/
├── script.js
├── manifest.json
└── README.md
```

## Informations techniques

- Manifest : WebExtension Manifest V3 ;
- Identifiant Firefox : `mdt-auto-presence-extension@local` ;
- Version minimale de Firefox : 140 ;
- Permissions de collecte de données déclarées : aucune.
