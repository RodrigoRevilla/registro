import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolicitudDialog } from './solicitud-dialog';

describe('SolicitudDialog', () => {
  let component: SolicitudDialog;
  let fixture: ComponentFixture<SolicitudDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolicitudDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolicitudDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
