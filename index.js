import { Telegraf } from 'telegraf'
import pg from 'pg';
import express from 'express';
import bodyParser from 'body-parser'
import cors from 'cors'
import moment from 'moment'

moment.locale('ru');

const production_token = "1618943992:AAEWsKDdD9_VWvpcPHNjGFs8WpQBDJ93JbA";
const dev_token = "1782112572:AAFMbiHosVWH1TqKUXLmUUuiNV8q5Je0MPE";
const current_token = process.env.PORT === undefined ? dev_token : production_token;

const bot = new Telegraf(dev_token);
const Pool = pg.Pool
const pool = new Pool({
    user: 'hyhdsfgcsfgtko',
    host: 'ec2-54-229-68-88.eu-west-1.compute.amazonaws.com',
    database: 'dfjq5clee4ahv4',
    password: 'bf322de92e8333896e987ab29ee34ae0b57ffdd145ee11e91b825e6b6de530df',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    },
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

const sendCallRequestNotification = (client) => {
    pool.query('SELECT * FROM telegram_bot_users WHERE course_id = 0', [], (error, usersResult) => {
        if (error) {
            throw error
        }
        for(let i = 0; i < usersResult.rows.length; i++){
            let message =
                `Новый запрос на обратный звонок!\nТелефон: ${client.phone}\nВремя: ${client.currentDate}`;
            bot.telegram.sendMessage(usersResult.rows[i]['chat_id'], message);
        }
    })
}

const sendClientInfoNotification = (subcourse_id, client) => {
    pool.query('SELECT * FROM subcourses WHERE id = $1', [subcourse_id], (error, subcoursesResults) => {
        if (error) {
            throw error
        }

        const course_id = subcoursesResults.rows[0]['course_id'];

        pool.query('SELECT * FROM telegram_bot_users WHERE course_id = $1 or course_id = 0', [course_id], (error, usersResult) => {
            if (error) {
                throw error
            }
            console.log("Users count: " + usersResult.rows.length);
            for(let i = 0; i < usersResult.rows.length; i++){
                let message =
                    `Поздравляем с новым студентом вашего образовательного центра "${client.center_name}"!\n\nКурс: ${client.subcourse_title}\nРасписание: ${client.subcourse_schedule}\nФИО: ${client.fullname}\nТелефон: ${client.phone}\nEmail: ${client.email}\nОплаченная сумма: ${client.pay_sum}\nДата записи на курс: ${client.date}\nКод студента: ${client.code}\n`;
                bot.telegram.sendMessage(usersResult.rows[i]['chat_id'], message);
            }
        })
    })
}

const sendPartnershipRequestNotification = (partner) => {
    pool.query('SELECT * FROM telegram_bot_users WHERE course_id = 0', [], (error, usersResult) => {
        if (error) {
            throw error
        }
        for(let i = 0; i < usersResult.rows.length; i++){
            let message =
                `У вас новая заявка на сотрудничество!\n\nНазвание компании: ${partner.company_name}\nФИО: ${partner.fullname}\nТелефон: ${partner.phone}\nПочта: ${partner.email}\n`;
            bot.telegram.sendMessage(usersResult.rows[i]['chat_id'], message);
        }
    })
}

const app = express()
app.use(cors())

app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)

app.post('/telegram/sendCallRequest', (request, response) => {
    const { phone } = request.body;
    let currentDate = moment().format();
    sendCallRequestNotification({phone: phone, currentDate: currentDate})
    response.status(201).send(`call_requests created`)
})

app.post('/telegram/sendNewStudentInfo', (request, response) => {
    const {subcourseId, client} = request.body;
    sendClientInfoNotification(subcourseId, client);
    response.status(201).send(`student_info created`)
})

app.post('/telegram/sendPartnershipRequest', (request, response) => {
    const { partner } = request.body;
    sendPartnershipRequestNotification(partner);
    response.status(201).send(`student_info created`)
})

let port = process.env.PORT === undefined ? 3333 : process.env.PORT;
app.listen(port, () => {
    console.log(`Oilan bot running on port ${port}.`)
})