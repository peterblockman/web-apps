import { Config, ConfigService } from './config.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { type } from 'os';

export type Data = {
  BeforeDate: string;
  Result: any;
};

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  constructor(private readonly http: HttpClient, private readonly config: ConfigService) {}

  list() {
    return this.http
      .get<Data[]>(`${this.config.config.extension?.monitor?.monitorURL}/list`, {
        params: {
          start_year: '2021',
          start_month: '09',
          start_day: '28',
          count: '1',
        },
      })
      .toPromise();
  }
}
