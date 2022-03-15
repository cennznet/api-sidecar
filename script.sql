create database nft_tracker;
use nft_tracker;
create table event_tracker (
                               id bigint NOT NULL AUTO_INCREMENT,
                               stream_id VARCHAR(50),
                               type TINYINT,
                               version bigint,
                               data JSON NOT NULL,
                               signer    varchar(100) null,
                               PRIMARY KEY (id),
                               UNIQUE KEY(stream_id, version)
)ENGINE=InnoDB;
