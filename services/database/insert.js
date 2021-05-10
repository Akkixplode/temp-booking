let {executeQuery, checkAvailability, tryLevelUp} = require('./index.js');
const {newBooking: sendNewBookingMail} = require('../mail.js');

async function addOuIds(person, ouIds){
	await executeQuery(ouIds.reduce((query, ouId)=>{
		return query+"INSERT INTO ou_map (person_id, ou_id, role, admin) VALUES(" + person.id + ", " + ouId + ",'" + person.role + "'," + person.groupAdmin + ");"
	}, ""));	
}

module.exports = {
    person: async function (person, done) {
        try{
			let exists = await executeQuery("SELECT * FROM person WHERE email='" + person.email + "';");
			if(exists.length>0){
				if(person.ouIds){
					person.id = exists[0]._id;
					let existingOus = await executeQuery("SELECT ou_id FROM ou_map WHERE person_id=" + exists[0]._id);
					let ouIdsToAdd = person.ouIds.reduce((total, elem)=>{
						for(let ouId in existingOus){
							if(existingOus[ouId].ou_id==elem){
								return total;
							}
						}
						total.push(elem);
						return total;
					}, [])
					if(ouIdsToAdd.length>0){
						await addOuIds(person, ouIdsToAdd);
						return done(null, person.email + " ADDED OUS: " + ouIdsToAdd.join(' '));
					}
				}
				return done(null, person.email + " ALREADY EXISTS");
			}
            let {names, values} = person.getAllNamesAndValues();
            let query = "INSERT INTO person(" + names.join(',') +") VALUES(" + values.join(',') + ");";
            let result = await executeQuery(query);
            person.id = result.insertId;
            if(person.ouIds){
				await addOuIds(person, person.ouIds);
			}
            return done(null, person);
        }catch(err){
            return done(err);
        }
	},

    hash: function(personId, hash){
        return new Promise(async (resolve, reject)=>{
            try{
                let result = await executeQuery("INSERT INTO hash (person_id, hash) VALUES(" + personId + ", '"+ hash +"');");
                resolve(result.insertId);
            }catch(err){
                reject(err);
            }
        })
    },

    userAccount: function(person){
        return new Promise(async (resolve, reject)=>{
            try{
                await executeQuery("INSERT INTO user (person_id, password) VALUES(" + person.id + ",'" + person.password +"');");
                resolve(person);
            }catch(err){
                reject(err);
            }
        })
    },

    booking: async function(newBooking, done){
		try{
			//confirm if user is associated with the ou
            let checkOu = await executeQuery("SELECT * FROM ou_map INNER JOIN user ON user.person_id=ou_map.person_id WHERE ou_id=" + newBooking.ouId + " AND user._id="+ newBooking.creatorId);
            if(checkOu.length<1){
                return done(new Error("User not associated with Ou"));
            }

			await checkAvailability(newBooking);

			//if super creator change status to approved and next approvers and notifiers as empty
			// let creator = await executeQuery("SELECT user._id, user.person_id, person.email, user.super_admin, user.super_creator FROM user INNER JOIN person ON person_id= person._id WHERE user._id=" + newBooking.creatorId);
			// creator = creator[0];
			// newBooking.status = "PENDING";
			// if(creator.super_creator)
			// 	newBooking.status = "APPROVED";

			//insert booking
			let {names, values} = newBooking.getAllNamesAndValues();
			let addedBooking = await executeQuery("INSERT INTO " + newBooking.type 
				+ "(" + names.join(',') + ") VALUES(" + values.join(',') + ");");
			let bltBooking = await executeQuery("INSERT INTO blt(" + newBooking.type + "_id, creator_id, ou_id,status) VALUES("
				+ addedBooking.insertId + "," + newBooking.creatorId + "," + newBooking.ouId + ",'" + newBooking.status + "');");

			let person = await executeQuery("SELECT person_id FROM user INNER JOIN person ON person_id=person._id WHERE user._id=" + creatorId);
			person=person[0];

			let info = await tryLevelUp(bltBooking.insertId, person.person_id);

			await executeQuery("UPDATE blt SET level=level+" + levelsToJump + " WHERE _id=" + info.bltBooking.insertId);
				
			if(info.mailTo.length<1){
				//UPDATE: change status to approve add responses
				info.mailTo.push(creator.email);
			}else{
				info.mailCc.push(creator.email);
			}
			newBooking.id = info.bltBooking.insertId;
			await sendNewBookingMail(newBooking, info);
			return done(null, newBooking);
		}
		catch(err){
			return done(err);
		}
	},

	response: async function(){
		await executeQuery("INSERT INTO response() VALUES (" + ")");
	}
};