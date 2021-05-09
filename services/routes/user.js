const auth = require('../auth.js');
const {getClass, User} = require('../controller.js');
const { checkAvailability } = require('../database/index.js');
const {appointment: addAppointment} = require('../database/insert.js');
const {ou: getOu, userAppointments: getUserAppointments} = require('../database/get.js');
const {user: updateUser} = require('../database/update.js')
const {appointment: delAppointment} = require('../database/del.js');
const upload = require('../upload.js');
const {respondError, removeImg} = require('../utils.js');

module.exports = function(app){

    app.route('/api/my-appointments')
    .get(auth.ensureAuthenticated, (req, res)=>{
        getUserAppointments({userId: req.user.id, ouId: req.query.ouId}, (err, appointments)=>{
            if(err) return respondError(err, res);
            res.status(200).json(appointments);
        });
    })
    .delete(auth.ensureAuthenticated, (req, res)=>{
        if(req.body.id){
            delAppointment({
                user: req.user,
                appointmentId: req.body.id
            })
            .then(msg=>{
                res.status(200).json({message: msg});
            })
            .catch(err=>respondError(err, res));
        }else{
            respondError('Unsupported query', res);
        }
    })

    app.route('/image/:fileName')
    .get(auth.ensureAuthenticated, (req, res)=>{
        res.sendFile(process.cwd() + '/uploads/' + req.params.fileName)
    })

    app.route('/api/ou')
    .get(auth.ensureAuthenticated, (req, res)=>{
        getOu(req.user.personId, (err, results)=>{
            if(err) respondError(err, res);
            res.status(200).json(results);
        })
    })

    app.route('/api/book')
    .patch(auth.ensureAuthenticated, (req, res)=>{
        respondError(new Error("Inworks"), res);
    })
    .post(auth.ensureAuthenticated, (req, res)=>{
        upload.single('img')(req, res, (err)=>{
            try{
                if(err) throw err;
                let newAppointment;
                req.body.img = req.file?req.file.filename:null;
                req.body.creatorId = req.user.id;
                AppointmentClass= getClass(req.body.type);
                newAppointment = new AppointmentClass(req.body);
                newAppointment.checkRequired(newAppointment);
                addAppointment(newAppointment, (err, doc)=>{
                    if(err){
                        return respondError(err, res);
                    }
                    return res.status(200).json(doc);
                })
            }
            catch(err){
                removeImg(req.body.img);
                respondError(err, res);
            }
        })
    })

    app.route('/api/check-availability')
    .post(auth.ensureAuthenticated, (req, res)=>{
        if(!req.body.type || !req.body.startTime || !req.body.endTime)
            return respondError(new Error("Required fields missing"), res)
        req.body.startTime = new Date(req.body.startTime)   ;
        req.body.endTime = new Date(req.body.endTime);
        checkAvailability(req.body, (err, msg)=>{
            if(err) return respondError(err, res);
            res.status(200).json({message: msg});
        });
    })

    app.route('/api/user')
    .patch(auth.ensureAuthenticated, (req, res)=>{
        req.body.id = req.user.id;
        updateUser(req.body, (err, result)=>{
            if(err) return respondError(err, res);
            res.status(200).json({message: result});
        });
    })

    app.route('/api/credentials')
    .get(auth.ensureAuthenticated, (req, res)=>{
        res.status(200).json(req.user.getPublicInfo());
    })

    app.route('/api/activity')
    .get(auth.ensureAuthenticated, (req, res)=>{
        database.getActivity((err, results)=>{
            if(err) return respondError(err, res);
            res.status(200).json(results);
        })
    })
}