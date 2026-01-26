import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActaDetalle } from './acta-detalle';

describe('ActaDetalle', () => {
  let component: ActaDetalle;
  let fixture: ComponentFixture<ActaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActaDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActaDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
