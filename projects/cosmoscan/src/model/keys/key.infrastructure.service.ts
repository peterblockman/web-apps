import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Key, KeyType } from './key.model';
import { IKeyInfrastructure } from './key.service';
import {
  cosmosclient
} from 'cosmos-client';
import { CosmosSDKService } from '../../model/cosmos-sdk.service';

@Injectable({
  providedIn: 'root',
})
export class KeyInfrastructureService implements IKeyInfrastructure {
  private db: Dexie;

  constructor(private readonly cosmosSDK: CosmosSDKService) {
    const dbName = 'cosmoscan';
    this.db = new Dexie(dbName);
    this.db.version(1).stores({
      keys: '++index, &id, type, public_key',
    });
  }

  getPrivKey(type: KeyType, privateKey: string) {
    const privKeyBuffer = Buffer.from(privateKey, 'hex');
    switch (type) {
      case KeyType.SECP256K1:
        return new cosmosclient.secp256k1.PrivKey({ key: privKeyBuffer });
      case KeyType.ED25519:
        throw Error('not supported yet')
      case KeyType.SR25519:
        throw Error('not supported yet')
    }
  }

  getPubKey(type: KeyType, publicKey: string) {
    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    switch (type) {
      case KeyType.SECP256K1:
        return new cosmosclient.secp256k1.PubKey({ key: pubKeyBuffer });
      case KeyType.ED25519:
        throw Error('not supported yet')
      case KeyType.SR25519:
        throw Error('not supported yet')
    }
  }

  async getPrivateKeyFromMnemonic(mnemonic: string) {

    return Buffer.from(
      await cosmosclient.generatePrivKeyFromMnemonic(mnemonic)
    ).toString('hex');
  }

  /**
   * Get one from Indexed DB
   * @param id
   */
  async get(id: string): Promise<Key | undefined> {
    try {
      const data = await this.db.table('keys').get({ id });
      if (data !== undefined) {
        return {
          id: data.id,
          type: data.type,
          public_key: data.public_key,
        };
      }
    } catch (error) {
      console.error(error);
    }
    return undefined;
  }

  /**
   * Get all from Indexed DB
   */
  async list(): Promise<Key[]> {
    return (await this.db.table('keys').toArray()).map((data) => ({
      id: data.id,
      type: data.type,
      public_key: data.public_key,
    }));
  }

  /**
   * Set with id in Indexed DB
   * @param id
   * @param type
   * @param privateKey
   */
  async set(id: string, type: KeyType, privateKey: string) {
    const key = await this.get(id);
    if (key !== undefined) {
      throw new Error('Already exists');
    }

    const privKey = this.getPrivKey(type, privateKey);
    const publicKey = Buffer.from(privKey.pubKey().bytes()).toString('hex');

    const data: Key = {
      id,
      type,
      public_key: publicKey,
    };
    await this.db.table('keys').put(data);
  }

  /**
   * Delete with id from Indexed DB
   * @param id
   */
  async delete(id: string) {
    await this.db.table('keys').where('id').equals(id).delete();
  }
}