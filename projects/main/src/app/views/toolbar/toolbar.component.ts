import { Component, OnInit, Output, EventEmitter, Input, ViewChild } from '@angular/core';
import { NgModel } from '@angular/forms';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';

export type SearchResult = {
  searchValue: string;
  type: string;
};

@Component({
  selector: 'view-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css'],
})
export class ToolbarComponent implements OnInit {
  @Input()
  searchResult?: SearchResult | null;

  @Output()
  appSubmitSearchResult: EventEmitter<SearchResult>;

  @Output()
  appChangeInputValue: EventEmitter<string>;

  @ViewChild('searchValueRef')
  searchValueRef!: NgModel;

  searchValue: string;

  constructor() {
    this.searchValue = '';
    this.searchResult = {
      searchValue: '',
      type: '',
    };
    this.appSubmitSearchResult = new EventEmitter();
    this.appChangeInputValue = new EventEmitter();
  }

  ngOnInit(): void {}

  onOptionSelected(): void {
    if (this.searchResult) {
      console.log(this.searchResult);
      this.appSubmitSearchResult.emit(this.searchResult);
      this.searchResult = { searchValue: '', type: '' };
    } else {
      // Todo: snackbar notification
    }
  }

  onSubmitSearchResult(): void {
    console.log(this.searchResult);
    if (this.searchResult) {
      this.appSubmitSearchResult.emit(this.searchResult);
    } else {
      // Todo: snackbar notification
    }
  }

  onChangeInput(inputValue: string): void {
    this.appChangeInputValue.emit(inputValue);
  }
}
