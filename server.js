var express         = require('express');
var path            = require('path');
var favicon         = require('serve-favicon');
var morgan          = require('morgan');
var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');
var log             = require('./libs/log')(module);
var config          = require('./libs/config');
var passport        = require('passport');
var oauth2          = require('./libs/oauth2');
var oauth           = require('./libs/oauth');
var ArticleModel    = require('./libs/mongoose').ArticleModel;
var router = express.Router();

var app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(passport.initialize());

app.use(favicon(__dirname + "/public/favicon.png"));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(router);
app.use(express.static(path.join(__dirname, "public")));

app.get('/login', function(req, res) {
    res.render('index');
});

app.post('/login', function(req, res) {
    //console.log("username:" + req.post("username1"));
    var body = "";
    req.on('data', function (chunk) {
        body += chunk;
    });
    req.on('end', function () {
        console.log('POSTed: ' + body);
        res.writeHead(200);
        res.end(body);
    });
});

//
//app.get('/loginFailure', function(req, res, next) {
//    res.send('Failed to authenticate');
//});
//
//app.get('/loginSuccess', function(req, res, next) {
//    res.send('Successfully authenticated');
//});

app.post('/oauth/token', oauth2.token);
app.get('/api/userInfo',
    passport.authenticate('bearer', { session: false }),
    function(req, res) {
        res.json({ user_id: req.user.userId, name: req.user.username, scope: req.authInfo.scope })
    }
);

app.get('/', function(req, res){
    res.redirect('/login');
});

app.get('/api', function (req, res) {
    res.send("API Running");
});

app.get('/api/articles', function(req, res) {
    return ArticleModel.find(function(err, articles) {
        if (!err) {
            return res.send(articles);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});

app.post('/api/articles', function(req, res) {
    //res.send('This is not implemented now');
    var article = new ArticleModel({
        title: req.body.title,
        author: req.body.author,
        description: req.body.description,
        images: req.body.images
    });

    article.save(function (err) {
        if (!err) {
            log.info("article created");
            return res.send({ status: 'OK', article:article });
        } else {
            console.log(err);
            if(err.name == 'ValidationError') {
                res.statusCode = 400;
                res.send({ error: 'Validation error' });
            } else {
                res.statusCode = 500;
                res.send({ error: 'Server error' });
            }
            log.error('Internal error(%d): %s',res.statusCode,err.message);
        }
    });

});

app.get('/api/articles/:id', function(req, res) {
    return ArticleModel.findById(req.params.id, function (err, article) {
        if(!article) {
            res.statusCode = 404;
            return res.send({ error: 'Not found' });
        }
        if (!err) {
            return res.send({ status: 'OK', article:article });
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});

app.put('/api/articles/:id', function (req, res){
    //res.send('This is not implemented now');
    return ArticleModel.findById(req.params.id, function (err, article) {
        if(!article) {
            res.statusCode = 404;
            return res.send({ error: 'Not found' });
        }

        article.title = req.body.title;
        article.description = req.body.description;
        article.author = req.body.author;
        article.images = req.body.images;
        return article.save(function (err) {
            if (!err) {
                log.info("article updated");
                return res.send({ status: 'OK', article:article });
            } else {
                if(err.name == 'ValidationError') {
                    res.statusCode = 400;
                    res.send({ error: 'Validation error' });
                } else {
                    res.statusCode = 500;
                    res.send({ error: 'Server error' });
                }
                log.error('Internal error(%d): %s',res.statusCode,err.message);
            }
        });
    });
});

app.delete('/api/articles/:id', function (req, res){
    //res.send('This is not implemented now');
    return ArticleModel.findById(req.params.id, function (err, article) {
        if(!article) {
            res.statusCode = 404;
            return res.send({ error: 'Not found' });
        }
        return article.remove(function (err) {
            if (!err) {
                log.info("article removed");
                return res.send({ status: 'OK' });
            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s',res.statusCode,err.message);
                return res.send({ error: 'Server error' });
            }
        });
    });
});

app.use(function(req, res, next){
    res.status(404);
    log.debug('Not found URL: %s',req.url);
    res.send({ error: 'Not found' });
    return;
});

app.use(function(err, req, res, next){
    res.status(err.status || 500);
    log.error('Internal error(%d): %s',res.statusCode,err.message);
    res.send({ error: err.message });
    return;
});

app.get('/ErrorExample', function(req, res, next){
    next(new Error('Random error!'));
});

app.listen(config.get('port'), function(){
    console.log('Express server listening on port ' + config.get('port'));
});