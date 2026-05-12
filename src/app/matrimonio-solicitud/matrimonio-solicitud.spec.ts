import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatrimonioSolicitud } from './matrimonio-solicitud';

describe('MatrimonioSolicitud', () => {
  let component: MatrimonioSolicitud;
  let fixture: ComponentFixture<MatrimonioSolicitud>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrimonioSolicitud]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatrimonioSolicitud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
