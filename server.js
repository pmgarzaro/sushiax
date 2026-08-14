const express = require('express');
const app = express();
let   orders = {};
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// Route pour afficher toutes les commandes
app.get('/orders', (req, res) => {
    res.sendFile(__dirname + '/orders.html');
});

// API JSON utilisée par la page des commandes pour afficher l'état actuel du serveur
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

app.use(express.static(__dirname));

// Route pour l'enregistrement d'une commande
app.post('/register', function(req, res) {
    const name = (req.body.name || '').trim();
    const order = (req.body.order || '').trim();

    if (!name || !order) {
        return res.redirect('/');
    }

    if (orders[name]) {
        // Si l'utilisateur a déjà passé une commande, on ajoute sa nouvelle commande à son tableau de commandes existant
        orders[name].push(order);
    } else {
        // Si l'utilisateur n'a jamais passé de commande, on crée un nouveau tableau de commandes pour lui et on y ajoute sa commande
        orders[name] = [order];
    }
    res.redirect('/orders');
});

app.post('/clear', function(req, res) {
    orders = {};
    res.redirect('/orders');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
