var express = require('express')
var router = express.Router()
var users = require('./users')
var database = require('../database')
var moment = require('moment')


const renderTodoListPage = function(list, req, res) {
  Promise.all([
      req.getCurrentUser(),
      database.getAllTasksByUserId(req.session.userId)
    ])
    .then(results => {
      const currentUser = results[0]
      let tasks = results[1]

      tasks = tasks.filter(task => {
        return list === 'all' ||
          (list === 'work' & task.is_work) ||
          (list === 'personal' & !task.is_work);
      })

      res.render('profile', {
        currentUser: currentUser,
        tasks: tasks,
        newTask: {},
        humanizeDate: humanizeDate,
        list: list
      })
    })
    .catch(error => {
      res.render('error', {
        error: error,
      })
    })
}

/* GET home page. */
router.get('/', (req, res, next) => {
  if (!req.loggedIn) {
    res.render('index')
    return
  }
  renderTodoListPage('all', req, res)
})

router.get('/:list', (req, res, next) => {
  const list = req.params.list.toLowerCase()
  if (list === 'work') {
    return renderTodoListPage('work', req, res)
  }
  if (list === 'personal') {
    return renderTodoListPage('personal', req, res)
  }
  next()
})


const humanizeDate = (date) => {
  return moment(date).format('MMM Do YY')
}

router.get('/login', (req, res) => {
  res.render('login')
})

router.get('/signup', (req, res) => {
  res.render('signup', {
    email: ''
  })
})

router.post('/login', (req, res) => {
  const email = req.body.email
  const password = req.body.password
  database.authenticateUser(email, password)
    .then(userId => {
      if (userId) {
        req.session.userId = userId
        res.redirect('/')
      } else {
        res.render('login', {
          error: 'Email or Password Not Found'
        })
      }
    })
    .catch(error => {
      res.render('error', {
        error: error,
      })
    })
})

router.post('/signup', (req, res) => {
  const attributes = req.body.user
  const email = attributes.email
  const password = attributes.password
  const password_confirmation = attributes.password_confirmation
  const bio = attributes.bio
  if (password !== '' && password !== password_confirmation) {
    res.render('signup', {
      error: 'Passwords Do Not Match',
      email: email,
    })
  } else {
    database.createUser(attributes)
      .then(user => {
        req.session.userId = user.id
        res.redirect('/')
      })
      .catch(error => {
        res.render('index', {
          error: error,
          email: email,
        })
      })
  }
})

router.get('/tasks/:taskId/delete', (req, res) => {
  database.deleteTask(req.params.taskId)
    .then(() => {
      res.redirect('/')
    })
    .catch(error => {
      res.render('error', {
        error: error,
      })
    })
})

const listToPath = list => !list || list === 'all' ? '/' : '/' + list

router.get('/tasks/:taskId/uncomplete', (req, res) => {
  database.uncompleteTask(req.params.taskId)
    .then(() => {
      res.redirect(listToPath(req.query.list))
    })
    .catch(error => {
      res.render('error', {
        error: error,
      })
    })
})

router.get('/tasks/:taskId/complete', (req, res) => {
  database.completeTask(req.params.taskId)
    .then(() => {
      res.redirect(listToPath(req.query.list))
    })
    .catch(error => {
      res.render('error', {
        error: error,
      })
    })
})

router.post('/tasks', (req, res) => {
  const task = req.body.task
  task.is_work = task.is_work === 'true'
  task.userId = req.session.userId
  database.createTask(task)
    .then(task => {
      res.redirect(listToPath(req.body.list))
    })
    .catch(error => {
      res.render('new_task_form', {
        error: error,
        newTask: task,
      })
    })
})

router.post('/tasks/set-ranks', (req, res) => {
  const newRanks = req.body
  database.setRanks(req.session.userId, newRanks)
    .then(task => {
      res.send('')
    })
    .catch(error => {
      res.status(400).json({
        errorMessage: error.message,
        error: error,
      })
    })
})


router.post('/tasks/:taskId', (req, res) => {
  const task = req.body.task
  task.taskId = req.params.taskId
  database.updateTask(task)
    .then(task => {
      res.redirect(listToPath(req.body.list))
    })
    .catch(error => {
      res.render('error', {
        error: error,
      })
    })
})



router.get('/logout', (req, res) => {
  res.redirect('/login')
})

router.use('/users', users)

module.exports = router
