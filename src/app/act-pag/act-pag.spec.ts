import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActPag } from './act-pag';

describe('ActPag', () => {
  let component: ActPag;
  let fixture: ComponentFixture<ActPag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActPag]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActPag);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
