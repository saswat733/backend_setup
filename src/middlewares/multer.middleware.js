import multer from 'multer'

const storage = multer.diskStorage({

    //place where the files will be temporarily stored
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },

    //file name 

    filename: function (req, file, cb) {
     
      cb(null, file.originalname)
    }
  })
  
 export const upload = multer({ storage, })