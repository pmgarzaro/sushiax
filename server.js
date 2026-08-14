const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'orders.json');

let orders = {};
try {
    orders = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {
    orders = {};
}

function saveOrders() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

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
    saveOrders();
    res.redirect('/orders');
});

// Route pour supprimer une commande précise d'une personne
app.delete('/api/orders/:name/:index', function(req, res) {
    const name = req.params.name;
    const index = parseInt(req.params.index, 10);

    if (!orders[name] || !Number.isInteger(index) || index < 0 || index >= orders[name].length) {
        return res.status(404).json({ error: 'Commande introuvable' });
    }

    orders[name].splice(index, 1);
    if (orders[name].length === 0) {
        delete orders[name];
    }
    saveOrders();
    res.json(orders);
});

app.post('/clear', function(req, res) {
    orders = {};
    saveOrders();
    res.redirect('/orders');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
