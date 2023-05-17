import 'reflect-metadata'
import { exit } from "process";
import * as fs from 'fs';
import * as path from 'path';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUrl, validateSync } from "class-validator";
import nodeMailer = require("nodemailer");
import { plainToInstance } from 'class-transformer';

class Config {
    @IsNotEmpty()
    @IsUrl()
    readonly smtpHost: string;
  
    @IsNotEmpty()
    @IsInt()
    @IsPositive()
    readonly smtpPort: number;
  
    @IsOptional()
    @IsString()
    readonly smtpUser: string;

    @IsOptional()
    @IsString()
    readonly smtpPass: string;

    get hasAuth() : boolean {
        if ( this.smtpUser && this.smtpPass ) {
            return this.smtpUser.length > 0 && this.smtpPass.length > 0;
        } else {
            return false;
        }
    }
  }

function createTransport( cfg: Config ) : nodeMailer.Transporter {
    if ( cfg.hasAuth ) {
        return nodeMailer.createTransport({
            host: cfg.smtpHost,
            port: cfg.smtpPort,
            secure: true,
            auth: {
              user: cfg.smtpUser,
              pass: cfg.smtpPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });
    } else {
        return nodeMailer.createTransport({
            host: cfg.smtpHost,
            port: cfg.smtpPort,
            secure: true,
            tls: {
              rejectUnauthorized: false,
            },
          });
    }
}

async function boostrap() {
    const command = process.argv[2];

    switch ( command ) {
        case "help": {
            console.log("cara menggunakan: node main.js send {from} {to} {subject} {text} {(optional config path)./config.json}");
        } break;

        case "send": {
            sendMail();
        } break;
    }
}

async function sendMail() {
    const from = process.argv[3];
    const to = process.argv[4];
    const subject = process.argv[5];
    const text = process.argv[6];

    const cfg = readConfigFile(process.argv[7]);

    console.log("creating email transport"); enter();
    const transporter = createTransport(cfg);

    console.log(`sending email from ${from} to ${to} with subject ${subject}: ${text}`); enter();
    const result = await transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        text: text,
    });

    console.log("sent result");
    console.log(result); enter();
}

function readConfigFile(cpath ?: string) : Config {
    const configPath = cpath ?? path.resolve( __dirname, 'config.json' );

    console.log(`check config file exists: ${configPath}`);
    checkConfigFileExists(configPath);

    console.log(`reading config file: ${configPath}`);
    const config = plainToInstance( Config, readJsonFile(configPath), { enableImplicitConversion: true } );
    const configValidation = validateSync( config );
    if ( configValidation.length > 0 ) {
        console.log(`invalid configuration: ${configValidation}`);
        exit(2);
    }
    console.log(config); enter();
    return config;
}

function enter() {
    console.log("\n\n");
}
  

function readJsonFile(path: string) : object {
    const rawConfig = fs.readFileSync(path);
    return JSON.parse(rawConfig.toString());
}

function checkConfigFileExists( path: string ) {
    try {
      const configExists = fs.existsSync( path );
      if ( !configExists ) { throw new Error( `configuration file was not found` ); }
      const exists = fs.existsSync( path );
      if ( !exists ) { throw new Error( `file ${path} was not found` ); }
    } catch ( error ) {
      console.error( error );
      exit(1);
    }
}

boostrap();
